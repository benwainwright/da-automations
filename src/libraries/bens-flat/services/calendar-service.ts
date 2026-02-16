import { google } from "googleapis";
import { TServiceParams } from "@digital-alchemy/core";

interface TimedCalendarEvent {
  type: "timed";
  title: string;
  location: string;
  startTime: Date;
  endTime: Date;
}

interface AllDayEvent {
  type: "all-day";
  title: string;
  location: string;
  date: Date;
}

type CalendarEvent = AllDayEvent | TimedCalendarEvent;

export function CalendarService({ config, scheduler, lifecycle, logger }: TServiceParams) {
  let cachedEvents: CalendarEvent[] = [];

  const fetchEvents = async (calendarId: string): Promise<CalendarEvent[]> => {
    try {
      const cal = google.calendar({
        version: "v3",
        auth: config.bens_flat.GOOGLE_CALENDAR_TOKEN,
      });

      const events = await cal.events.list({
        calendarId: calendarId,
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      });

      return (
        events.data.items?.map((event) => {
          const withTimeDetails = event.start?.dateTime
            ? ({
                startTime: new Date(event.start.dateTime),
                endTime: new Date(event.end?.dateTime ?? ""),
                type: "timed",
              } as const)
            : ({
                date: new Date(event.start?.date ?? ""),
                type: "all-day",
              } as const);

          return {
            title: event.summary ?? "",
            location: event.location ?? "",
            ...withTimeDetails,
          };
        }) ?? []
      );
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error);
      }
      throw error;
    }
  };

  const refreshEvents = async () => {
    const calendarId = config.bens_flat.GOOGLE_CALENDAR_ID;
    if (calendarId) {
      logger.info(`Polling calendar ${calendarId} for new events`);
      const foundEvents = await fetchEvents(calendarId);

      cachedEvents = foundEvents;
    }
  };

  lifecycle.onReady(async () => {
    await refreshEvents();
    scheduler.setInterval(async () => {
      await refreshEvents();
    }, "10m");
  });

  return { events: cachedEvents };
}
