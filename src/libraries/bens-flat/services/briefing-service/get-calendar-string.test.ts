import { expect, mock, test } from "bun:test";
import dayjs from "dayjs";
import { getCalendarString } from "./get-calendar-string.ts";

test("formats calendar events with count and readable times", async () => {
  const fetcher = mock(async () => [
    {
      end: "2026-02-19T10:00:00.000Z",
      start: "2026-02-19T09:00:00.000Z",
      summary: "Standup",
    },
    {
      end: "2026-02-19T15:30:00.000Z",
      start: "2026-02-19T15:00:00.000Z",
      summary: "Doctor",
    },
  ]);

  const result = await getCalendarString(fetcher);

  expect(result).toBe(
    "You currently have 2 events in your calendar: Standup at 9:00am, Doctor at 3:00pm",
  );
});

test("returns zero-events message when no events are scheduled", async () => {
  const fetcher = mock(async () => []);

  const result = await getCalendarString(fetcher);

  expect(result).toBe("there is no events in your calendar");
});

test("uses singular event wording when exactly one event exists", async () => {
  const fetcher = mock(async () => [
    {
      end: "2026-02-19T10:00:00.000Z",
      start: "2026-02-19T09:00:00.000Z",
      summary: "Standup",
    },
  ]);

  const result = await getCalendarString(fetcher);

  expect(result).toBe("You currently have 1 event in your calendar: Standup at 9:00am");
});

test("requests today's events from personal calendar", async () => {
  const fetcher = mock(async () => []);

  await getCalendarString(fetcher);

  expect(fetcher).toHaveBeenCalledTimes(1);
  const [args] = (fetcher as any).mock.calls[0];

  expect(dayjs.isDayjs(args.start)).toBe(true);
  expect(dayjs.isDayjs(args.end)).toBe(true);
  expect(args.start.isSame(dayjs(), "day")).toBe(true);
  expect(args.end.isSame(dayjs(), "day")).toBe(true);
  expect(args.start.isBefore(args.end)).toBe(true);
});
