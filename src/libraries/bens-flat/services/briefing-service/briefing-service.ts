import { TServiceParams } from "@digital-alchemy/core";
import { getDateAndTimeString } from "./get-day-and-time-string.ts";
import { formatWeatherForSpeech } from "./format-weather-for-speech.ts";
import { getCalendarString } from "./get-calendar-string.ts";
import { getTodoListString } from "./get-todo-list-string.ts";

export function BriefingService({
  hass,
  synapse,
  context,
  bens_flat: { notify },
  logger,
}: TServiceParams) {
  const triggerBriefing = synapse.button({
    unique_id: "trigger-briefing",
    name: "Briefing",
    context,
  });

  const readBriefing = async () => {
    logger.info(`Triggering briefing`);

    const briefingStringParts = [
      `Good morning!`,
      getDateAndTimeString(),
      formatWeatherForSpeech(hass, "weather.home"),
      await getCalendarString(hass),
      await getTodoListString(hass),
    ];

    await notify.speak(briefingStringParts.join(" "));
  };

  triggerBriefing.onPress(async () => {
    await readBriefing();
  });

  return { read: readBriefing };
}
