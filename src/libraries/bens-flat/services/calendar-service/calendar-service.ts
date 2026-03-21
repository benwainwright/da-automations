import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";
import { Dayjs } from "dayjs";
import { getCalendarString } from "./get-calendar-string.ts";
import { mdi } from "../icons.ts";

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

export function CalendarService({
  hass,
  synapse,
  context,
  bens_flat: { entityIds, notify },
}: TServiceParams) {
  const events = synapse.button({
    name: "Events",
    context,
    icon: mdi.calendarBlank,
    unique_id: "calendar-button",
  });

  const getEvents = async ({ start, end }: IGetEventsParams) => {
    const response = await hass.call.calendar.get_events<
      GetCalendarResponse<typeof entityIds.calendar.personalCalendar>
    >({
      entity_id: entityIds.calendar.personalCalendar,
      start_date_time: start.toISOString(),
      end_date_time: end.toISOString(),
    });
    return response[entityIds.calendar.personalCalendar].events;
  };

  const getCalendarEventsString = async () => {
    return await getCalendarString(getEvents);
  };

  events.onPress(async () => {
    await notify.speak({ announce: true, message: await getCalendarEventsString() });
  });

  return { getEvents, toString: getCalendarEventsString };
}
