import { expect, test } from "bun:test";
import dayjs from "dayjs";
import { isBuyTask, scheduleTodoistTasks, uiPriority } from "./schedule-todoist-tasks.ts";
import { client, event, events, task } from "./schedule-todoist-tasks.test-helpers.ts";

test("maps Todoist API priorities to UI priority order", () => {
  expect(uiPriority(4)).toBe(1);
  expect(uiPriority(3)).toBe(2);
  expect(uiPriority(2)).toBe(3);
  expect(uiPriority(1)).toBe(4);
});

test("detects buy tasks by title or label", () => {
  expect(isBuyTask(task({ content: "buy new headphones" }))).toBe(true);
  expect(isBuyTask(task({ content: "New headphones", labels: ["Buy"] }))).toBe(true);
  expect(isBuyTask(task({ content: "Research headphones" }))).toBe(false);
});

test("skips recurring and dontmove tasks", async () => {
  const result = await scheduleTodoistTasks({
    client: client([
      task({ id: "recurring", content: "Recurring", due: { isRecurring: true } }),
      task({ id: "dontmove", content: "Pinned", labels: ["dontmove"] }),
      task({ id: "normal", content: "Normal" }),
    ]),
    dryRun: true,
    getCalendarEvents: events(),
    now: dayjs("2026-05-04"),
  });

  expect(result.eligible).toBe(1);
  expect(result.updated.map((update) => update.taskId)).toEqual(["normal"]);
  expect(result.skipped.map((skipped) => skipped.taskId)).toEqual(["recurring", "dontmove"]);
});

test("schedules higher UI priority tasks first", async () => {
  const result = await scheduleTodoistTasks({
    client: client([
      task({ id: "p4", content: "P4", priority: 1 }),
      task({ id: "p1", content: "P1", priority: 4 }),
      task({ id: "p2", content: "P2", priority: 3 }),
    ]),
    dryRun: true,
    getCalendarEvents: events(),
    now: dayjs("2026-05-04"),
  });

  expect(result.updated.map((update) => [update.taskId, update.dueDate])).toEqual([
    ["p1", "2026-05-04"],
    ["p2", "2026-05-05"],
    ["p4", "2026-05-06"],
  ]);
});

test("does not schedule tasks on days with work and an evening event", async () => {
  const result = await scheduleTodoistTasks({
    client: client([task({ id: "task", content: "Task" })]),
    dryRun: true,
    getCalendarEvents: events({
      "2026-05-04": [
        event("2026-05-04T09:00:00", "2026-05-04T17:00:00", "Work"),
        event("2026-05-04T19:00:00", "2026-05-04T20:00:00", "Dinner"),
      ],
    }),
    now: dayjs("2026-05-04"),
  });

  expect(result.updated[0]?.dueDate).toBe("2026-05-05");
});

test("allows at most two small tasks after work", async () => {
  const result = await scheduleTodoistTasks({
    client: client([
      task({ id: "a", content: "A", labels: ["small"] }),
      task({ id: "b", content: "B", labels: ["small"] }),
      task({ id: "c", content: "C", labels: ["small"] }),
    ]),
    dryRun: true,
    getCalendarEvents: events({
      "2026-05-04": [event("2026-05-04T09:00:00", "2026-05-04T17:00:00", "Work")],
    }),
    now: dayjs("2026-05-04"),
  });

  expect(result.updated.map((update) => [update.taskId, update.dueDate])).toEqual([
    ["a", "2026-05-04"],
    ["b", "2026-05-04"],
    ["c", "2026-05-05"],
  ]);
});

test("keeps large tasks off workdays and places them on weekends", async () => {
  const result = await scheduleTodoistTasks({
    client: client([task({ id: "large", content: "Large", labels: ["large"] })]),
    dryRun: true,
    getCalendarEvents: events(),
    now: dayjs("2026-05-04"),
  });

  expect(result.updated[0]?.dueDate).toBe("2026-05-09");
});

test("keeps deadline tasks on or before their deadline", async () => {
  const result = await scheduleTodoistTasks({
    client: client([task({ id: "deadline", content: "Deadline", deadline: "2026-05-05" })]),
    dryRun: true,
    getCalendarEvents: events({
      "2026-05-04": [
        event("2026-05-04T09:00:00", "2026-05-04T17:00:00", "Work"),
        event("2026-05-04T19:00:00", "2026-05-04T20:00:00", "Dinner"),
      ],
    }),
    now: dayjs("2026-05-04"),
  });

  expect(result.updated[0]?.dueDate).toBe("2026-05-05");
});

test("skips deadline tasks when no legal slot exists before the deadline", async () => {
  const result = await scheduleTodoistTasks({
    client: client([task({ id: "deadline", content: "Deadline", deadline: "2026-05-04" })]),
    dryRun: true,
    getCalendarEvents: events({
      "2026-05-04": [
        event("2026-05-04T09:00:00", "2026-05-04T17:00:00", "Work"),
        event("2026-05-04T19:00:00", "2026-05-04T20:00:00", "Dinner"),
      ],
    }),
    now: dayjs("2026-05-04"),
  });

  expect(result.updated).toEqual([]);
  expect(result.skipped.some((skipped) => skipped.taskId === "deadline")).toBe(true);
});

test("places P3 and P4 buy tasks on the first empty weekend from the first of the month", async () => {
  const result = await scheduleTodoistTasks({
    client: client([
      task({ id: "buy", content: "Buy shelves", priority: 2 }),
      task({ id: "other", content: "Other low priority", priority: 2 }),
    ]),
    dryRun: true,
    getCalendarEvents: events(),
    now: dayjs("2026-05-01"),
  });

  expect(result.updated.map((update) => [update.taskId, update.dueDate])).toEqual([
    ["other", "2026-05-01"],
    ["buy", "2026-05-02"],
  ]);
});

test("uses the next budget cycle after this month's first empty weekend has passed", async () => {
  const result = await scheduleTodoistTasks({
    client: client([task({ id: "buy", content: "Buy shelves", priority: 2 })]),
    dryRun: true,
    getCalendarEvents: events(),
    now: dayjs("2026-05-03"),
  });

  expect(result.updated[0]?.dueDate).toBe("2026-06-06");
});
