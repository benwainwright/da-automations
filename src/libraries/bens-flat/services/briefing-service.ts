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

  const getDateAndTimeString = () => {
    const now = dayjs();

    const time = now.format("h:mm A"); // 7:05 PM
    const day = now.format("dddd"); // Tuesday
    const date = now.format("Do MMMM"); // 18 February

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
      await getReadCalendarString(),
    ];

    await notify.speak(briefingStringParts.join(" "));
  };

  triggerBriefing.onPress(async () => {
    await readBriefing();
  });

  return { read: readBriefing };
}
