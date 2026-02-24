import { beforeEach, expect, mock, test } from "bun:test";
import { SleepModeService } from "./sleep-mode-service.ts";

beforeEach(() => {
  mock.clearAllMocks();
});

test("turning sleep mode on enables the expected adaptive-lighting sleep switches", async () => {
  let onTurnOn: (() => Promise<void>) | undefined;
  const turnOnAll = mock(async () => {});
  const getEvents = mock(async () => []);
  const speak = mock(async () => {});
  const command = mock(async () => {});
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
      calender: { getEvents },
      notify: { speak },
      alexa: { command },
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
      call: { switch: { turn_off: mock(async () => {}) } },
      socket: { onEvent: (_config: unknown) => {} },
    },
    logger: { info: mock(() => {}) },
    synapse: {
      button: () => ({
        onPress: (_cb: () => Promise<void>) => {},
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

  await onTurnOn?.();

  expect(turnOnAll).toHaveBeenCalledTimes(1);
  expect(turnOnAll).toHaveBeenCalledWith([
    "switch.adaptive_lighting_sleep_mode_hallway",
    "switch.adaptive_lighting_sleep_mode_living_room",
    "switch.adaptive_lighting_sleep_mode_bathroom",
    "switch.adaptive_lighting_sleep_mode_spare_room",
  ]);
  expect(getEvents).toHaveBeenCalledTimes(1);
  expect(speak).toHaveBeenCalledTimes(1);
  expect(command).not.toHaveBeenCalled();
});
