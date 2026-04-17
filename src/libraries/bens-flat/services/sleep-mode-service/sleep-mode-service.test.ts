import { afterEach, beforeEach, expect, mock, setSystemTime, test } from "bun:test";
import type { Dayjs } from "dayjs";
import { SleepModeService } from "./sleep-mode-service.ts";

beforeEach(() => {
  mock.clearAllMocks();
});

afterEach(() => {
  setSystemTime();
});

type CalendarEvent = { start: string; end: string; summary: string };
type GetEventsParams = { start: Dayjs; end: Dayjs };

function setupSleepModeService(events: CalendarEvent[] = []) {
  let onTurnOn: (() => Promise<void>) | undefined;
  let onAlarmPress: (() => Promise<void>) | undefined;
  const turnOnAll = mock(async () => {});
  const getEvents = mock(async (_params: GetEventsParams) => events);
  const speak = mock(async () => {});
  const command = mock(async () => {});
  const turnOffSwitch = mock(async () => {});
  const latch = (_callback: () => Promise<void> | void, start = false) => {
    let triggered = start;
    return {
      trigger: async () => {
        if (triggered) {
          return;
        }
        triggered = true;
        await _callback();
      },
      reset: async () => {
        triggered = false;
      },
    };
  };

  SleepModeService({
    automation: { time: { isAfter: () => false } },
    bens_flat: {
      briefing: { read: mock(async () => {}) },
      helpers: { turnOffAll: mock(async () => {}), turnOnAll, latch },
      calendar: { getEvents },
      notify: { speak },
      alexa: { command },
      entityIds: {
        switches: {
          adaptiveLightingSleepModeBathroom: "switch.adaptive_lighting_sleep_mode_bathroom",
          adaptiveLightingSleepModeBedroom: "switch.adaptive_lighting_sleep_mode_bedroom",
          adaptiveLightingSleepModeHallway: "switch.adaptive_lighting_sleep_mode_hallway",
          adaptiveLightingSleepModeLivingRoom: "switch.adaptive_lighting_sleep_mode_living_room",
          adaptiveLightingSleepModeSpareRoom: "switch.adaptive_lighting_sleep_mode_spare_room",
          autoplayMusic: "switch.autoplay_music",
        },
        mediaPlayers: {
          bedroomSonos: "media_player.bedroom_sonos_one",
        },
      },
      visitor: {
        visitorMode: {
          getEntity: () => ({ state: "off" }),
        },
      },
      lights: { turnOffAll: mock(async () => {}) },
      motion: {
        livingRoom: (_cb: () => Promise<void> | void) => {},
        hallway: (_cb: () => Promise<void> | void) => {},
        bathroom: (_cb: () => Promise<void> | void) => {},
      },
    },
    context: {},
    hass: {
      call: { switch: { turn_off: turnOffSwitch } },
      socket: { onEvent: (_config: unknown) => {} },
    },
    logger: { info: mock(() => {}) },
    synapse: {
      button: () => ({
        onPress: (cb: () => Promise<void>) => {
          onAlarmPress = cb;
        },
      }),
      switch: () => ({
        entity_id: "switch.sleep_mode",
        is_on: false,
        onTurnOff: (_cb: () => Promise<void>) => {},
        onTurnOn: (cb: () => Promise<void>) => {
          onTurnOn = cb;
        },
        getEntity: () => ({ turn_on: async () => {} }),
      }),
    },
  } as any);

  return {
    command,
    getEvents,
    onAlarmPress: () => onAlarmPress?.(),
    onTurnOn,
    speak,
    turnOffSwitch,
    turnOnAll,
  };
}

test("turning sleep mode on enables the expected adaptive-lighting sleep switches", async () => {
  const { getEvents, onTurnOn, speak, turnOffSwitch, turnOnAll, command } = setupSleepModeService();

  await onTurnOn?.();

  expect(turnOnAll).toHaveBeenCalledTimes(1);
  expect(turnOnAll).toHaveBeenCalledWith([
    "switch.adaptive_lighting_sleep_mode_bathroom",
    "switch.adaptive_lighting_sleep_mode_bedroom",
    "switch.adaptive_lighting_sleep_mode_hallway",
    "switch.adaptive_lighting_sleep_mode_living_room",
    "switch.adaptive_lighting_sleep_mode_spare_room",
  ]);
  expect(getEvents).toHaveBeenCalledTimes(1);
  expect(speak).toHaveBeenCalledTimes(1);
  expect(command).not.toHaveBeenCalled();
  expect(turnOffSwitch).toHaveBeenCalledWith({ entity_id: "switch.autoplay_music" });
});

test("set alarm uses today's calendar when triggered after midnight before morning", async () => {
  setSystemTime(new Date("2026-05-05T00:30:00"));
  const { command, getEvents, onAlarmPress } = setupSleepModeService([
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
  expect(command).toHaveBeenCalledWith({
    player: "media_player.bedroom_sonos_one",
    command: "Set alarm for 7:30 AM this morning",
  });
});

test("set alarm says today when there are no events after midnight before morning", async () => {
  setSystemTime(new Date("2026-05-05T00:30:00"));
  const { onAlarmPress, speak } = setupSleepModeService();

  await onAlarmPress();

  expect(speak).toHaveBeenCalledWith({
    message: "No events in calendar today. Goodnight!",
    announce: false,
    volume: 0.5,
  });
});

test("set alarm uses tomorrow's calendar before midnight", async () => {
  setSystemTime(new Date("2026-05-04T23:30:00"));
  const { command, getEvents, onAlarmPress } = setupSleepModeService([
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
  expect(command).toHaveBeenCalledWith({
    player: "media_player.bedroom_sonos_one",
    command: "Set alarm for 7:30 AM tomorrow morning",
  });
});
