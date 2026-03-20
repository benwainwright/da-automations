import dayjs, { Dayjs } from "dayjs";

interface CalendarEvent {
  start: string;
  end: string;
  summary: string;
  location?: string;
}

type Fetcher = (config: { start: Dayjs; end: Dayjs }) => Promise<CalendarEvent[]>;

export const getCalendarString = async (fetcher: Fetcher) => {
  const startOfToday = dayjs().startOf("day");
  const endOfToday = dayjs().endOf("day");
  const events = await fetcher({
    start: startOfToday,
    end: endOfToday,
  });

  if (events.length === 0) {
    return "there is no events in your calendar";
  }

  const readString = events
    .map((event) => `${event.summary} at ${dayjs(event.start).format("h:mma")}`)
    .join(", ");
  const eventLabel = events.length === 1 ? "event" : "events";

  return `You currently have ${events.length} ${eventLabel} in your calendar: ${readString}`;
};
