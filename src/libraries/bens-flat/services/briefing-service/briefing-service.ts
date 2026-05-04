import { TServiceParams } from "@digital-alchemy/core";
import { getDateAndTimeString } from "./get-day-and-time-string.ts";
import { formatWeatherForSpeech } from "./format-weather-for-speech.ts";
import { mdi } from "../icons.ts";
import { FIVE_AM, THREE_PM } from "../constants.ts";

/**
 * Responsible for constructing and playing my morning briefing
 */
export function BriefingService({
  hass,
  synapse,
  context,
  bens_flat: {
    notify,
    helpers,
    cd,
    visitor,
    podcasts,
    calendar,
    todoList,
    entityIds,
    sleepMode,
    motion,
    tvMode,
  },
  automation: { time },
  logger,
}: TServiceParams) {
  const triggerBriefing = synapse.button({
    unique_id: "trigger-briefing",
    name: "Briefing",
    icon: mdi.chat,
    context,
  });

  const readMorningBriefing = async () => {
    logger.info(`Triggering briefing`);

    const briefingStringParts = [
      `Good morning!`,
      getDateAndTimeString(),
      formatWeatherForSpeech(hass, "weather.home"),
      await calendar.toString(),
      (await todoList.toString()) ?? "You have nothing in your todo list",
    ];

    await notify.speak({ message: briefingStringParts.join(" "), announce: false, volume: 0.5 });
    await podcasts.playLatestEpisode("library://podcast/3");
  };

  triggerBriefing.onPress(async () => {
    await readMorningBriefing();
  });

  const reminders = synapse.switch({
    name: "Reminders",
    context,
    icon: mdi.checkCircleOutline,

    unique_id: "todo-list-reminders",
  });

  const { trigger: triggerTodoList } = helpers.timedLatch(async () => {
    const todoListString = await todoList.toString();
    if (todoListString) {
      await notify.speak({
        message: todoListString,
        announce: true,
        volume: 0.5,
      });
    }
  }, [1, "hour"]);

  motion.anywhere(async () => {
    if (
      reminders.is_on &&
      !sleepMode.isOn() &&
      time.isAfter("PM01:30") &&
      !tvMode.isOn() &&
      !cd.cdSwitch.is_on
    ) {
      await triggerTodoList();
    }
  });

  const { trigger: readBriefing, reset: resetBriefing } = helpers.latch(readMorningBriefing, true);

  const morningTrigger = async () => {
    const visitorModeEntity = visitor?.visitorMode?.getEntity?.();
    const visitorModeIsOn = visitorModeEntity?.state === "on";
    if (time.isAfter(FIVE_AM) && !visitorModeIsOn && time.isBefore(THREE_PM)) {
      const briefingWasRead = await readBriefing();
      if (!briefingWasRead) {
        return;
      }
      await Promise.allSettled([
        hass.call.switch.turn_on({ entity_id: entityIds.switches.bedroomMotionSensor }),
        hass.call.switch.turn_on({ entity_id: entityIds.switches.autoplayMusic }),
      ]);
    }
  };

  sleepMode.sleepModeSwitch.onTurnOn(() => {
    resetBriefing();
  });

  motion.livingRoom(morningTrigger);
  motion.hallway(morningTrigger);
  motion.bathroom(morningTrigger);

  return { read: readMorningBriefing, remindersSwitch: reminders };
}
