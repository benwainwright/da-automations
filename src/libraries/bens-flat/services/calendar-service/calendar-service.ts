import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";
import { Dayjs } from "dayjs";

interface IGetEventsParams {
  start: Dayjs;
  end: Dayjs;
}

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

export function CalendarService({ hass }: TServiceParams) {
  const getEvents = async ({ start, end }: IGetEventsParams) => {
    const response = await hass.call.calendar.get_events<
      GetCalendarResponse<"calendar.personal_calendar">
    >({
      entity_id: "calendar.personal_calendar",
      start_date_time: start.toISOString(),
      end_date_time: end.toISOString(),
    });
    return response["calendar.personal_calendar"].events;
  };
  return { getEvents };
}
