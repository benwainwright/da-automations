import { TServiceParams } from "@digital-alchemy/core";
import { TodoistApi } from "@doist/todoist-api-typescript";
import { getTodoListString } from "./get-todo-list-string.ts";
import { scheduleTodoistTasks } from "./schedule-todoist-tasks.ts";
import { mdi } from "../icons.ts";

export function TodoListService({
  hass,
  bens_flat: { calendar, notify },
  config,
  context,
  logger,
  synapse,
}: TServiceParams) {
  const scheduleTasksButton = synapse.button({
    context,
    icon: mdi.checkCircleOutline,
    name: "Schedule Todoist",
    suggested_object_id: "schedule_todoist",
    unique_id: "schedule-todoist",
  });

  const generateTodoListString = async () => {
    return await getTodoListString(hass);
  };

  const scheduleTasks = async ({ dryRun = false }: { dryRun?: boolean } = {}) => {
    const client = new TodoistApi(config.bens_flat.TODOIST_TOKEN);

    return await scheduleTodoistTasks({
      client,
      dryRun,
      getCalendarEvents: calendar.getEvents,
    });
  };

  scheduleTasksButton.onPress(async () => {
    try {
      const result = await scheduleTasks();
      logger.info({
        inspected: result.inspected,
        eligible: result.eligible,
        updated: result.updated.length,
        unchanged: result.unchanged.length,
        skipped: result.skipped.length,
        failed: result.failed.length,
        skippedTasks: result.skipped,
        failedTasks: result.failed.map(({ error, ...task }) => ({
          ...task,
          error: error instanceof Error ? error.message : String(error),
        })),
      });
    } catch (error) {
      logger.error(`Failed to schedule Todoist tasks`, error);
      await notify.notifyCritical({
        title: "Todoist scheduling failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return { scheduleTodoistTasks: scheduleTasks, toString: generateTodoListString };
}
