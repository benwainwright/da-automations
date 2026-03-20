import { TServiceParams } from "@digital-alchemy/core";
import { getTodoListString } from "./get-todo-list-string.ts";

export function TodoListService({ hass, synapse, context, bens_flat: { notify } }: TServiceParams) {
  const generateTodoListString = async () => {
    return await getTodoListString(hass);
  };

  const readTodoListButton = synapse.button({
    name: "Todo list",
    context,
    icon: "mdi:check-circle-outline",
    unique_id: "read-todo-list",
  });

  readTodoListButton.onPress(async () => {
    await notify.speak({ message: await generateTodoListString(), announce: true, volume: 0.5 });
  });

  return { toString: generateTodoListString };
}
