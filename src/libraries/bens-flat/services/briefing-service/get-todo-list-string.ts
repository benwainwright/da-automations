import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";
import dayjs from "dayjs";

interface TodoItem {
  summary: string;
  status: string;
  uuid: string;
  due?: string;
}

type GetTodoItemsResponse<TTodoList extends PICK_ENTITY<"todo"> = PICK_ENTITY<"todo">> = {
  [K in TTodoList]: {
    items: TodoItem[];
  };
};

export const getTodoListString = async (hass: TServiceParams["hass"]) => {
  const today = dayjs();
  const items = Object.values(
    await hass.call.todo.get_items<GetTodoItemsResponse>({
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
    }),
  )
    .flatMap((item) => item.items)
    .filter((item) => {
      if (!item.due) return false;

      return dayjs(item.due).isSame(today, "day") || dayjs(item.due).isBefore(today);
    });

  const countString = `You have ${items.length} items in your todo list: `;

  const itemsString = items.map((item) => item.summary).join(", ");

  if (items.length === 0) {
    return `You have nothing in your todo list`;
  }

  return `${countString} ${itemsString}`;
};
