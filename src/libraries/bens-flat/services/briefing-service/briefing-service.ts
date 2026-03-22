import { TServiceParams } from "@digital-alchemy/core";
import { getDateAndTimeString } from "./get-day-and-time-string.ts";
import { formatWeatherForSpeech } from "./format-weather-for-speech.ts";
import { mdi } from "../icons.ts";

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
    mediaPlayer,
    calender,
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
      await calender.toString(),
      (await todoList.toString()) ?? "You have nothing in your todo list",
    ];

    await notify.speak({ message: briefingStringParts.join(" "), announce: false, volume: 0.5 });
    await hass.call.media_player.shuffle_set({
      shuffle: false,
      entity_id: entityIds.mediaPlayers.wholeFlat,
    });
    await mediaPlayer.play({
      player: entityIds.mediaPlayers.wholeFlat,
      id: "library://podcast/3",
      type: "music",
      volume: 0.5,
    });
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

  const { trigger } = helpers.timedLatch(async () => {
    const todoListString = await todoList.toString();
    if (todoListString) {
      await notify.speak({ message: todoListString, announce: true, volume: 0.5 });
    }
  }, [1, "hour"]);

  motion.anywhere(() => {
    if (reminders.is_on && !sleepMode.isOn() && time.isAfter("PM01:30") && !tvMode.isOn()) {
      trigger();
    }
  });

  return { read: readMorningBriefing };
}
