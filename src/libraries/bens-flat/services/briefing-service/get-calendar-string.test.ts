import { expect, mock, test } from "bun:test";
import dayjs from "dayjs";
import { getCalendarString } from "./get-calendar-string.ts";

test("formats calendar events with count and readable times", async () => {
  const get_events = mock(async () => ({
    "calendar.personal_calendar": {
      events: [
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
      ],
    },
  }));

  const result = await getCalendarString({
    call: { calendar: { get_events } },
  } as any);

  expect(result).toBe(
    "You currently have 2 events in your calendar: Standup at 9:00am, Doctor at 3:00pm",
  );
});

test("returns zero-events message when no events are scheduled", async () => {
  const get_events = mock(async () => ({
    "calendar.personal_calendar": { events: [] },
  }));

  const result = await getCalendarString({
    call: { calendar: { get_events } },
  } as any);

  expect(result).toBe("theer is no events in your calendar");
});

test("uses singular event wording when exactly one event exists", async () => {
  const get_events = mock(async () => ({
    "calendar.personal_calendar": {
      events: [
        {
          end: "2026-02-19T10:00:00.000Z",
          start: "2026-02-19T09:00:00.000Z",
          summary: "Standup",
        },
      ],
    },
  }));

  const result = await getCalendarString({
    call: { calendar: { get_events } },
  } as any);

  expect(result).toBe("You currently have 1 event in your calendar: Standup at 9:00am");
});

test("requests today's events from personal calendar", async () => {
  const get_events = mock(async () => ({
    "calendar.personal_calendar": { events: [] },
  }));

  await getCalendarString({
    call: { calendar: { get_events } },
  } as any);

  expect(get_events).toHaveBeenCalledTimes(1);
  expect(get_events).toHaveBeenCalledWith({
    end_date_time: expect.any(String),
    entity_id: "calendar.personal_calendar",
    start_date_time: expect.any(String),
  });

  const [args] = (get_events as any).mock.calls[0];
  expect(dayjs(args.start_date_time).isValid()).toBe(true);
  expect(dayjs(args.end_date_time).isValid()).toBe(true);
  expect(dayjs(args.start_date_time).isSame(dayjs(), "day")).toBe(true);
  expect(dayjs(args.end_date_time).isSame(dayjs(), "day")).toBe(true);
  expect(dayjs(args.start_date_time).isBefore(dayjs(args.end_date_time))).toBe(true);
});
