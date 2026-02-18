import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";
import dayjs from "dayjs";

interface CalendarEvent {
  start: string;
  end: string;
  summary: string;
  location?: string;
}

type GetCalendarResponse<TCalendar extends PICK_ENTITY<"calendar">> = {
  [K in TCalendar]: {
    events: CalendarEvent[];
  };
};

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

  function degreesToCompass(degrees: number): string {
    const directions = [
      "north",
      "north-east",
      "east",
      "south-east",
      "south",
      "south-west",
      "west",
      "north-west",
    ];

    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  const formatWeatherForSpeech = (weather: PICK_ENTITY<"weather">) => {
    const { state, attributes } = hass.refBy.id(weather);

    const temperature = Math.round(attributes.temperature);
    const windSpeed = Math.round(attributes.wind_speed);
    const windDirection = degreesToCompass(attributes.wind_bearing);

    return `The weather in Manchester is ${state} and ${temperature} degrees, with ${windDirection} winds at ${windSpeed} kilometres per hour.`;
  };

  const getDateAndTimeString = () => {
    const now = dayjs();

    const time = now.format("h:mm A");
    const day = now.format("dddd");
    const date = now.format("Do MMMM");

    return `The time is ${time} on ${day} the ${date}.`;
  };

  const getReadCalendarString = async () => {
    const startOfToday = dayjs().startOf("day").toISOString();
    const endOfToday = dayjs().endOf("day").toISOString();
    const events = await hass.call.calendar.get_events<
      GetCalendarResponse<"calendar.personal_calendar">
    >({
      entity_id: "calendar.personal_calendar",
      start_date_time: startOfToday,
      end_date_time: endOfToday,
    });

    const readString = events["calendar.personal_calendar"].events
      .map((event) => `${event.summary} at ${dayjs(event.start).format("h:mma")}`)
      .join(", ");

    return `You currently have ${events["calendar.personal_calendar"].events.length} events in your calendar: ${readString}`;
  };

  const readBriefing = async () => {
    logger.info(`Triggering briefing`);

    const briefingStringParts = [
      `Good morning!`,
      getDateAndTimeString(),
      formatWeatherForSpeech("weather.home"),
      await getReadCalendarString(),
    ];

    await notify.speak(briefingStringParts.join(" "));
  };

  triggerBriefing.onPress(async () => {
    await readBriefing();
  });

  return { read: readBriefing };
}
