import { mock } from "bun:test";
import dayjs from "dayjs";
import type { Task } from "@doist/todoist-api-typescript";
import type { CalendarEvent, TodoistClient } from "./schedule-todoist-tasks.ts";

type TaskOverrides = Omit<Partial<Task>, "deadline" | "due"> & {
  deadline?: string | null;
  due?: Partial<NonNullable<Task["due"]>> | null;
};

export function task({
  deadline: deadlineOverride,
  due: dueOverride,
  ...overrides
}: TaskOverrides = {}) {
  const deadline = deadlineOverride ? { date: deadlineOverride, lang: "en" } : null;
  const due =
    dueOverride === null
      ? null
      : dueOverride
        ? {
            date: "2026-05-01",
            isRecurring: false,
            string: "2026-05-01",
            ...dueOverride,
          }
        : null;

  return {
    addedAt: null,
    addedByUid: null,
    checked: false,
    childOrder: 1,
    completedAt: null,
    content: "Task",
    dayOrder: 1,
    deadline,
    description: "",
    due,
    duration: null,
    id: "task",
    isCollapsed: false,
    isDeleted: false,
    isUncompletable: false,
    labels: [],
    parentId: null,
    priority: 1,
    projectId: "project",
    responsibleUid: null,
    sectionId: null,
    updatedAt: null,
    url: "https://todoist.com/showTask?id=task",
    userId: "user",
    ...overrides,
  } as Task;
}

export function client(tasks: Task[]): TodoistClient {
  const getTasks = mock(async ({ cursor }: { cursor?: string | null } = {}) => {
    if (cursor === "next") return { nextCursor: null, results: tasks.slice(2) };
    return { nextCursor: tasks.length > 2 ? "next" : null, results: tasks.slice(0, 2) };
  });

  return {
    getTasks,
    updateTask: mock(async (id) => tasks.find((task) => task.id === id) ?? tasks[0]!),
  };
}

export function events(byDate: Record<string, CalendarEvent[]> = {}) {
  return mock(async ({ start, end }: { start: dayjs.Dayjs; end: dayjs.Dayjs }) => {
    return Object.entries(byDate).flatMap(([date, events]) => {
      if (dayjs(date).isBefore(start, "day") || dayjs(date).isAfter(end, "day")) return [];
      return events;
    });
  });
}

export function event(start: string, end: string, summary: string): CalendarEvent {
  return { end, start, summary };
}
