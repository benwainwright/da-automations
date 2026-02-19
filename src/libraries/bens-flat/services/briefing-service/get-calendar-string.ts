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
