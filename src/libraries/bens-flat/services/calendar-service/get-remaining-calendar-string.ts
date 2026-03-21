import dayjs, { Dayjs } from "dayjs";

interface CalendarEvent {
  start: string;
  end: string;
  summary: string;
  location?: string;
}

type Fetcher = (config: { start: Dayjs; end: Dayjs }) => Promise<CalendarEvent[]>;

export const getRemainingCalendarString = async (fetcher: Fetcher) => {
  const startOfToday = dayjs();
  const endOfToday = dayjs().endOf("day");

  const events = (
    await fetcher({
      start: startOfToday,
      end: endOfToday,
    })
  ).filter((event) => dayjs(event.start).isAfter(dayjs()));

  if (events.length === 0) {
    return null;
  }

  const readString = events
    .map((event) => `${event.summary} at ${dayjs(event.start).format("h:mma")}`)
    .join(", ");

  const eventLabel = events.length === 1 ? "event" : "events";

  return `You have ${events.length} ${eventLabel} remaining in your calendar today: ${readString}`;
};
