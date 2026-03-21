import { TServiceParams } from "@digital-alchemy/core";
import { getTodoListString } from "./get-todo-list-string.ts";
import { mdi } from "../icons.ts";

export function TodoListService({
  hass,
  synapse,
  context,
  bens_flat: { notify, helpers, motion, sleepMode, tvMode },
  automation: { time },
}: TServiceParams) {
  const generateTodoListString = async () => {
    return await getTodoListString(hass);
  };

  const reminders = synapse.switch({
    name: "Reminders",
    context,
    icon: mdi.checkCircleOutline,
    unique_id: "todo-list-reminders",
  });

  const { trigger } = helpers.timedLatch(async () => {
    await notify.speak({ message: await generateTodoListString(), announce: true, volume: 0.5 });
  }, [1, "hour"]);

  motion.anywhere(() => {
    if (reminders.is_on && !sleepMode.isOn() && time.isAfter("PM01:30") && !tvMode.isOn()) {
      trigger();
    }
  });

  return { toString: generateTodoListString };
}
