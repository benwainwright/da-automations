import { expect, mock, test } from "bun:test";
import dayjs from "dayjs";
import { getTodoListString } from "./get-todo-list-string.ts";

test("returns empty todo message when no due or overdue items exist", async () => {
  const get_items = mock(async () => ({
    "todo.admin": { items: [] },
    "todo.inbox": { items: [{ summary: "Future", status: "needs_action", uuid: "1" }] },
  }));

  const result = await getTodoListString({
    call: { todo: { get_items } },
  } as any);

  expect(result).toBe("You have nothing in your todo list");
});

test("includes only due-today and overdue items", async () => {
  const yesterday = dayjs().subtract(1, "day").toISOString();
  const today = dayjs().hour(9).minute(0).second(0).millisecond(0).toISOString();
  const tomorrow = dayjs().add(1, "day").toISOString();

  const get_items = mock(async () => ({
    "todo.admin": {
      items: [
        { summary: "Overdue item", status: "needs_action", uuid: "1", due: yesterday },
        { summary: "Today item", status: "needs_action", uuid: "2", due: today },
      ],
    },
    "todo.inbox": {
      items: [
        { summary: "Future item", status: "needs_action", uuid: "3", due: tomorrow },
        { summary: "No due date", status: "needs_action", uuid: "4" },
      ],
    },
  }));

  const result = await getTodoListString({
    call: { todo: { get_items } },
  } as any);

  expect(result).toContain("You have 2 items in your todo list:");
  expect(result).toContain("Overdue item");
  expect(result).toContain("Today item");
  expect(result).not.toContain("Future item");
  expect(result).not.toContain("No due date");
});

test("uses singular wording when exactly one item is due", async () => {
  const yesterday = dayjs().subtract(1, "day").toISOString();
  const tomorrow = dayjs().add(1, "day").toISOString();

  const get_items = mock(async () => ({
    "todo.admin": {
      items: [{ summary: "Only item", status: "needs_action", uuid: "1", due: yesterday }],
    },
    "todo.inbox": {
      items: [{ summary: "Future item", status: "needs_action", uuid: "2", due: tomorrow }],
    },
  }));

  const result = await getTodoListString({
    call: { todo: { get_items } },
  } as any);

  expect(result).toContain("You have 1 item in your todo list:");
  expect(result).toContain("Only item");
  expect(result).not.toContain("Future item");
});

test("requests items from expected todo entities", async () => {
  const get_items = mock(async () => ({}));

  await getTodoListString({
    call: { todo: { get_items } },
  } as any);

  expect(get_items).toHaveBeenCalledTimes(1);
  expect(get_items).toHaveBeenCalledWith({
    entity_id: [
      "todo.admin",
      "todo.domestic",
      "todo.health",
      "todo.hobbies",
      "todo.inbox",
      "todo.personal",
      "todo.personal",
      "todo.shopping_list",
      "todo.social",
      "todo.wishlist",
    ],
  });
});
