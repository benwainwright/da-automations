import { TServiceParams } from "@digital-alchemy/core";
import { getTodoListString } from "./get-todo-list-string.ts";

export function TodoListService({ hass }: TServiceParams) {
  const generateTodoListString = async () => {
    return await getTodoListString(hass);
  };

  return { toString: generateTodoListString };
}
