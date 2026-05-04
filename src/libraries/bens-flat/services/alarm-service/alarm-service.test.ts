import { afterEach, beforeEach, expect, mock, setSystemTime, test } from "bun:test";
import type { Dayjs } from "dayjs";
import { AlarmService } from "./alarm-service.ts";

beforeEach(() => {
  mock.clearAllMocks();
});

afterEach(() => {
  setSystemTime();
});

type CalendarEvent = { start: string; end: string; summary: string };
type GetEventsParams = { start: Dayjs; end: Dayjs };

function setupAlarmService(events: CalendarEvent[] = []) {
  let onAlarmPress: (() => Promise<void>) | undefined;
  const getEvents = mock(async (_params: GetEventsParams) => events);
  const speak = mock(async () => {});
  const command = mock(async () => {});

  const alarm = AlarmService({
    bens_flat: {
      alexa: { command },
      calendar: { getEvents },
      entityIds: {
        mediaPlayers: {
          bedroomSonos: "media_player.bedroom_sonos_one",
        },
      },
      notify: { speak },
    },
    context: {},
    synapse: {
      button: () => ({
        onPress: (cb: () => Promise<void>) => {
          onAlarmPress = cb;
        },
      }),
    },
  } as any);

  return {
    alarm,
    command,
    getEvents,
    onAlarmPress: () => onAlarmPress?.(),
    speak,
  };
}

test("set alarm uses today's calendar when triggered after midnight before morning", async () => {
  setSystemTime(new Date("2026-05-05T00:30:00"));
  const { command, getEvents, onAlarmPress, speak } = setupAlarmService([
    {
      start: "2026-05-05T09:00:00",
      end: "2026-05-05T10:00:00",
      summary: "Work",
    },
  ]);

  await onAlarmPress();

  const [{ start, end }] = getEvents.mock.calls[0];
  expect(start.format("YYYY-MM-DD")).toBe("2026-05-05");
  expect(end.format("YYYY-MM-DD")).toBe("2026-05-05");
  expect(speak).toHaveBeenCalledWith({
    message: "Setting alarm for Work",
    announce: false,
    volume: 0.5,
  });
  expect(command).toHaveBeenCalledWith({
    player: "media_player.bedroom_sonos_one",
    command: "Set alarm for 7:30 AM this morning",
  });
});

test("set alarm says today when there are no events after midnight before morning", async () => {
  setSystemTime(new Date("2026-05-05T00:30:00"));
  const { onAlarmPress, speak, command } = setupAlarmService();

  await onAlarmPress();

  expect(speak).toHaveBeenCalledWith({
    message: "No events in calendar today. Goodnight!",
    announce: false,
    volume: 0.5,
  });
  expect(command).not.toHaveBeenCalled();
});

test("set alarm uses tomorrow's calendar before midnight", async () => {
  setSystemTime(new Date("2026-05-04T23:30:00"));
  const { command, getEvents, onAlarmPress, speak } = setupAlarmService([
    {
      start: "2026-05-05T09:00:00",
      end: "2026-05-05T10:00:00",
      summary: "Work",
    },
  ]);

  await onAlarmPress();

  const [{ start, end }] = getEvents.mock.calls[0];
  expect(start.format("YYYY-MM-DD")).toBe("2026-05-05");
  expect(end.format("YYYY-MM-DD")).toBe("2026-05-05");
  expect(speak).toHaveBeenCalledWith({
    message: "Setting alarm for Work",
    announce: false,
    volume: 0.5,
  });
  expect(command).toHaveBeenCalledWith({
    player: "media_player.bedroom_sonos_one",
    command: "Set alarm for 7:30 AM tomorrow morning",
  });
});

test("sleep mode trigger calls the same alarm scheduling helper", async () => {
  setSystemTime(new Date("2026-05-04T23:30:00"));
  const { alarm, command, getEvents, speak } = setupAlarmService([
    {
      start: "2026-05-05T09:00:00",
      end: "2026-05-05T10:00:00",
      summary: "Work",
    },
  ]);

  await alarm.setForFirstEventOfNextDay();

  const [{ start, end }] = getEvents.mock.calls[0];
  expect(start.format("YYYY-MM-DD")).toBe("2026-05-05");
  expect(end.format("YYYY-MM-DD")).toBe("2026-05-05");
  expect(speak).toHaveBeenCalledWith({
    message: "Setting alarm for Work",
    announce: false,
    volume: 0.5,
  });
  expect(command).toHaveBeenCalledWith({
    player: "media_player.bedroom_sonos_one",
    command: "Set alarm for 7:30 AM tomorrow morning",
  });
});
