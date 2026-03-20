import { TServiceParams } from "@digital-alchemy/core";
import { getTodoListString } from "./get-todo-list-string.ts";
import { mdi } from "../icons.ts";

export function TodoListService({ hass, synapse, context, bens_flat: { notify } }: TServiceParams) {
  const generateTodoListString = async () => {
    return await getTodoListString(hass);
  };

  const readTodoListButton = synapse.button({
    name: "Todo list",
    context,
    icon: mdi.checkCircleOutline,
    unique_id: "read-todo-list",
  });

  readTodoListButton.onPress(async () => {
    await notify.speak({ message: await generateTodoListString(), announce: true, volume: 0.3 });
  });

  return { toString: generateTodoListString };
}
