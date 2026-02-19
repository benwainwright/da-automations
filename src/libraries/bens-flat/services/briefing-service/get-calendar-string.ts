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

export const getCalendarString = async (hass: TServiceParams["hass"]) => {
  const startOfToday = dayjs().startOf("day").toISOString();
  const endOfToday = dayjs().endOf("day").toISOString();
  const response = await hass.call.calendar.get_events<
    GetCalendarResponse<"calendar.personal_calendar">
  >({
    entity_id: "calendar.personal_calendar",
    start_date_time: startOfToday,
    end_date_time: endOfToday,
  });
  const events = response["calendar.personal_calendar"].events;

  if (events.length === 0) {
    return "theer is no events in your calendar";
  }

  const readString = events
    .map((event) => `${event.summary} at ${dayjs(event.start).format("h:mma")}`)
    .join(", ");
  const eventLabel = events.length === 1 ? "event" : "events";

  return `You currently have ${events.length} ${eventLabel} in your calendar: ${readString}`;
};
