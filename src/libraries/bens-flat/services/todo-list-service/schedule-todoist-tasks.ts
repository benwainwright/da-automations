import dayjs, { type Dayjs } from "dayjs";
import type { Duration, Task, UpdateTaskArgs } from "@doist/todoist-api-typescript";

export interface CalendarEvent {
  start: string;
  end: string;
  summary: string;
  location?: string;
}

export interface TodoistClient {
  getTasks(args?: { cursor?: string | null; limit?: number }): Promise<{
    results: Task[];
    nextCursor: string | null;
  }>;
  updateTask(id: string, args: UpdateTaskArgs): Promise<Task>;
}

export interface ScheduleTodoistTasksOptions {
  client: TodoistClient;
  getCalendarEvents: (config: { start: Dayjs; end: Dayjs }) => Promise<CalendarEvent[]>;
  dryRun?: boolean;
  now?: Dayjs;
}

export interface TaskUpdate {
  taskId: string;
  content: string;
  dueDate: string;
  duration: Duration;
  currentDueDate: string | null;
  hadDuration: boolean;
  update: UpdateTaskArgs;
}

export interface SkippedTask {
  taskId: string;
  content: string;
  reason: string;
}

export interface ScheduleTodoistTasksResult {
  inspected: number;
  eligible: number;
  updated: TaskUpdate[];
  unchanged: TaskUpdate[];
  skipped: SkippedTask[];
  failed: Array<SkippedTask & { error: unknown }>;
}

type TaskSize = "small" | "medium" | "large";

interface SchedulableTask {
  task: Task;
  duration: Duration;
  durationMinutes: number;
  size: TaskSize;
}

interface DayPlan {
  date: string;
  hasWork: boolean;
  hasEveningEvent: boolean;
  hasCalendarEvent: boolean;
  scheduled: SchedulableTask[];
  buyTasks: SchedulableTask[];
}

interface TaskBuckets {
  deadlineTasks: SchedulableTask[];
  highPriorityTasks: SchedulableTask[];
  buyTasks: SchedulableTask[];
  lowPriorityTasks: SchedulableTask[];
}

interface ScheduleContext {
  now: Dayjs;
  plans: Map<string, DayPlan>;
  getPlan: (date: Dayjs) => Promise<DayPlan>;
  result: ScheduleTodoistTasksResult;
}

const SMALL_MINUTES = 30;
const MEDIUM_MINUTES = 60;
const LARGE_MINUTES = 120;
const EVENING_HOUR = 18;
const MAX_SEARCH_DAYS = 3650;

export const uiPriority = (apiPriority: number) => {
  if (apiPriority === 4) return 1;
  if (apiPriority === 3) return 2;
  if (apiPriority === 2) return 3;
  return 4;
};

export const isBuyTask = (task: Pick<Task, "content" | "labels">) => {
  return (
    /\bbuy\b/i.test(task.content) ||
    task.labels.some((label) => label.toLocaleLowerCase() === "buy")
  );
};

export const getBudgetCycleStart = (now: Dayjs) => now.startOf("month");

export async function scheduleTodoistTasks({
  client,
  getCalendarEvents,
  dryRun = false,
  now = dayjs(),
}: ScheduleTodoistTasksOptions): Promise<ScheduleTodoistTasksResult> {
  const tasks = await getAllTasks(client);
  const result = createResult(tasks.length);
  const context = createScheduleContext({ getCalendarEvents, now, result });
  const schedulable = collectSchedulableTasks(tasks, result);

  result.eligible = schedulable.length;

  await assignTasksToDays(groupTasks(schedulable), context);
  await applyTaskUpdates({
    client,
    dryRun,
    result,
    updates: collectTaskUpdates(context.plans),
  });

  return result;
}

function createResult(inspected: number): ScheduleTodoistTasksResult {
  return {
    inspected,
    eligible: 0,
    updated: [],
    unchanged: [],
    skipped: [],
    failed: [],
  };
}

function collectSchedulableTasks(tasks: Task[], result: ScheduleTodoistTasksResult) {
  return tasks.flatMap((task) => {
    const skipped = getSkipReason(task);
    if (skipped) {
      result.skipped.push({ taskId: task.id, content: task.content, reason: skipped });
      return [];
    }
    return [toSchedulableTask(task)];
  });
}

function createScheduleContext({
  getCalendarEvents,
  now,
  result,
}: Pick<ScheduleTodoistTasksOptions, "getCalendarEvents"> & {
  now: Dayjs;
  result: ScheduleTodoistTasksResult;
}): ScheduleContext {
  const calendar = createCalendarCache(getCalendarEvents, now.startOf("day"));
  const plans = new Map<string, DayPlan>();

  return {
    now,
    plans,
    result,
    async getPlan(date) {
      const key = date.format("YYYY-MM-DD");
      const existing = plans.get(key);
      if (existing) return existing;

      const plan = createDayPlan(key, await calendar.getEventsForDay(date));
      plans.set(key, plan);
      return plan;
    },
  };
}

function createDayPlan(date: string, events: CalendarEvent[]): DayPlan {
  return {
    date,
    hasWork: events.some(isWorkEvent),
    hasEveningEvent: events.some(isEveningEvent),
    hasCalendarEvent: events.length > 0,
    scheduled: [],
    buyTasks: [],
  };
}

function groupTasks(tasks: SchedulableTask[]): TaskBuckets {
  const nonDeadlineTasks = tasks
    .filter(({ task }) => !task.deadline)
    .sort(compareByPriorityThenDuration);

  return {
    deadlineTasks: tasks.filter(({ task }) => task.deadline).sort(compareByPriorityThenDeadline),
    highPriorityTasks: nonDeadlineTasks.filter(({ task }) => uiPriority(task.priority) <= 2),
    buyTasks: nonDeadlineTasks.filter(
      ({ task }) => uiPriority(task.priority) >= 3 && isBuyTask(task),
    ),
    lowPriorityTasks: nonDeadlineTasks.filter(
      ({ task }) => uiPriority(task.priority) >= 3 && !isBuyTask(task),
    ),
  };
}

async function assignTasksToDays(tasks: TaskBuckets, context: ScheduleContext) {
  await assignDeadlineTasks(tasks.deadlineTasks, context);
  await assignStandardTasks(tasks.highPriorityTasks, context);
  await assignBuyTasks(tasks.buyTasks, context);
  await assignStandardTasks(tasks.lowPriorityTasks, context);
}

async function assignDeadlineTasks(tasks: SchedulableTask[], context: ScheduleContext) {
  for (const item of tasks) {
    const deadline = dayjs(item.task.deadline?.date).startOf("day");
    const plan = await findSlot({
      item,
      from: context.now.startOf("day"),
      until: deadline,
      getPlan: context.getPlan,
    });

    if (!plan) {
      skipTask(
        context.result,
        item,
        `no available slot before deadline ${deadline.format("YYYY-MM-DD")}`,
      );
      continue;
    }

    plan.scheduled.push(item);
  }
}

async function assignStandardTasks(tasks: SchedulableTask[], context: ScheduleContext) {
  for (const item of tasks) {
    const plan = await findSlot({
      item,
      from: context.now.startOf("day"),
      getPlan: context.getPlan,
    });

    if (!plan) {
      skipTask(context.result, item, "no available slot found");
      continue;
    }

    plan.scheduled.push(item);
  }
}

async function assignBuyTasks(tasks: SchedulableTask[], context: ScheduleContext) {
  if (tasks.length === 0) return;

  const plan = await findBuyTaskDay(context.now, context.getPlan);
  for (const item of tasks) {
    if (!plan) {
      skipTask(context.result, item, "no empty budget weekend found");
      continue;
    }

    plan.buyTasks.push(item);
  }
}

function skipTask(result: ScheduleTodoistTasksResult, item: SchedulableTask, reason: string) {
  result.skipped.push({
    taskId: item.task.id,
    content: item.task.content,
    reason,
  });
}

function collectTaskUpdates(plans: Map<string, DayPlan>) {
  return [...plans.values()]
    .flatMap((plan) =>
      [...plan.scheduled, ...plan.buyTasks].map((item) => toTaskUpdate(item, plan.date)),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

async function applyTaskUpdates({
  client,
  dryRun,
  result,
  updates,
}: {
  client: TodoistClient;
  dryRun: boolean;
  result: ScheduleTodoistTasksResult;
  updates: TaskUpdate[];
}) {
  for (const update of updates) {
    if (isUnchanged(update)) {
      result.unchanged.push(update);
      continue;
    }

    if (dryRun) {
      result.updated.push(update);
      continue;
    }

    try {
      await client.updateTask(update.taskId, update.update);
      result.updated.push(update);
    } catch (error) {
      result.failed.push({
        taskId: update.taskId,
        content: update.content,
        reason: "todoist update failed",
        error,
      });
    }
  }
}

async function getAllTasks(client: TodoistClient) {
  const tasks: Task[] = [];
  let cursor: string | null = null;

  do {
    const response = await client.getTasks({ cursor, limit: 200 });
    tasks.push(...response.results);
    cursor = response.nextCursor;
  } while (cursor);

  return tasks;
}

function getSkipReason(task: Task) {
  if (task.checked || task.completedAt) return "completed";
  if (task.isDeleted) return "deleted";
  if (task.due?.isRecurring) return "recurring";
  if (task.labels.some((label) => label.toLocaleLowerCase() === "dontmove")) return "dontmove";
  return null;
}

function toSchedulableTask(task: Task): SchedulableTask {
  const duration = task.duration ?? inferDuration(task);
  const durationMinutes = duration.unit === "day" ? LARGE_MINUTES : duration.amount;

  return {
    task,
    duration,
    durationMinutes,
    size: getTaskSize(durationMinutes),
  };
}

function inferDuration(task: Task): Duration {
  const labels = task.labels.map((label) => label.toLocaleLowerCase());
  if (labels.includes("small")) return { amount: SMALL_MINUTES, unit: "minute" };
  if (labels.includes("large")) return { amount: LARGE_MINUTES, unit: "minute" };
  return { amount: MEDIUM_MINUTES, unit: "minute" };
}

function getTaskSize(minutes: number): TaskSize {
  if (minutes <= SMALL_MINUTES) return "small";
  if (minutes <= MEDIUM_MINUTES) return "medium";
  return "large";
}

function compareByPriorityThenDeadline(a: SchedulableTask, b: SchedulableTask) {
  return (
    uiPriority(a.task.priority) - uiPriority(b.task.priority) ||
    (a.task.deadline?.date ?? "").localeCompare(b.task.deadline?.date ?? "") ||
    a.task.childOrder - b.task.childOrder
  );
}

function compareByPriorityThenDuration(a: SchedulableTask, b: SchedulableTask) {
  return (
    uiPriority(a.task.priority) - uiPriority(b.task.priority) ||
    a.durationMinutes - b.durationMinutes ||
    a.task.childOrder - b.task.childOrder
  );
}

async function findSlot({
  item,
  from,
  until,
  getPlan,
}: {
  item: SchedulableTask;
  from: Dayjs;
  until?: Dayjs;
  getPlan: (date: Dayjs) => Promise<DayPlan>;
}) {
  const last = until ?? from.add(MAX_SEARCH_DAYS, "day");

  for (let date = from; !date.isAfter(last, "day"); date = date.add(1, "day")) {
    const plan = await getPlan(date);
    if (canSchedule(plan, item, date)) return plan;
  }

  return null;
}

async function findBuyTaskDay(now: Dayjs, getPlan: (date: Dayjs) => Promise<DayPlan>) {
  let cycleStart = getBudgetCycleStart(now);

  for (let cycles = 0; cycles < 120; cycles += 1) {
    const plan = await findFirstEmptyWeekendInMonth(cycleStart, getPlan);
    if (plan && !dayjs(plan.date).isBefore(now, "day")) return plan;
    cycleStart = cycleStart.add(1, "month");
  }

  return null;
}

async function findFirstEmptyWeekendInMonth(
  cycleStart: Dayjs,
  getPlan: (date: Dayjs) => Promise<DayPlan>,
) {
  const firstWeekend = firstWeekendOnOrAfter(cycleStart);
  for (let date = firstWeekend; date.month() === cycleStart.month(); date = date.add(1, "day")) {
    if (![0, 6].includes(date.day())) continue;

    const plan = await getPlan(date);
    if (isEmptyWeekend(plan, date)) return plan;
  }

  return null;
}

function firstWeekendOnOrAfter(date: Dayjs) {
  if ([0, 6].includes(date.day())) return date;
  return date.add(6 - date.day(), "day");
}

function isEmptyWeekend(plan: DayPlan, date: Dayjs) {
  return (
    [0, 6].includes(date.day()) &&
    !isBlocked(plan) &&
    !plan.hasCalendarEvent &&
    plan.scheduled.length === 0
  );
}

function canSchedule(plan: DayPlan, item: SchedulableTask, date: Dayjs) {
  if (isBlocked(plan)) return false;

  if (plan.hasWork) {
    if (item.size === "large") return false;
    if (item.size === "medium") return plan.scheduled.length === 0;
    return (
      plan.scheduled.every((scheduled) => scheduled.size === "small") && plan.scheduled.length < 2
    );
  }

  if (item.size === "large" && ![0, 6].includes(date.day())) return false;

  const scheduledMinutes = plan.scheduled.reduce(
    (total, scheduled) => total + scheduled.durationMinutes,
    0,
  );
  const limit = [0, 6].includes(date.day()) ? 240 : 90;
  const taskLimit = [0, 6].includes(date.day()) ? 4 : 2;

  return scheduledMinutes + item.durationMinutes <= limit && plan.scheduled.length < taskLimit;
}

function isBlocked(plan: DayPlan) {
  return plan.hasWork && plan.hasEveningEvent;
}

function isWorkEvent(event: CalendarEvent) {
  return event.summary.trim().toLocaleLowerCase() === "work";
}

function isEveningEvent(event: CalendarEvent) {
  if (isWorkEvent(event) || !event.start.includes("T")) return false;
  return dayjs(event.start).hour() >= EVENING_HOUR || dayjs(event.end).hour() >= EVENING_HOUR;
}

function toTaskUpdate(item: SchedulableTask, dueDate: string): TaskUpdate {
  const update = item.task.duration
    ? ({ dueDate } satisfies UpdateTaskArgs)
    : ({
        dueDate,
        duration: item.duration.amount,
        durationUnit: item.duration.unit,
      } satisfies UpdateTaskArgs);

  return {
    taskId: item.task.id,
    content: item.task.content,
    dueDate,
    duration: item.duration,
    currentDueDate: item.task.due?.date ?? null,
    hadDuration: Boolean(item.task.duration),
    update,
  };
}

function isUnchanged(update: TaskUpdate) {
  return update.currentDueDate === update.dueDate && update.hadDuration;
}

function createCalendarCache(
  getCalendarEvents: ScheduleTodoistTasksOptions["getCalendarEvents"],
  start: Dayjs,
) {
  const eventsByDate = new Map<string, CalendarEvent[]>();
  let loadedThrough = start.subtract(1, "day");

  const loadThrough = async (date: Dayjs) => {
    while (loadedThrough.isBefore(date, "day")) {
      const rangeStart = loadedThrough.add(1, "day").startOf("day");
      const rangeEnd = rangeStart.add(89, "day").endOf("day");
      const events = await getCalendarEvents({ start: rangeStart, end: rangeEnd });

      for (const event of events) {
        const key = dayjs(event.start).format("YYYY-MM-DD");
        eventsByDate.set(key, [...(eventsByDate.get(key) ?? []), event]);
      }

      loadedThrough = rangeEnd;
    }
  };

  return {
    async getEventsForDay(date: Dayjs) {
      await loadThrough(date);
      return eventsByDate.get(date.format("YYYY-MM-DD")) ?? [];
    },
  };
}
