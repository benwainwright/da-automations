import { beforeEach, expect, mock, test } from "bun:test";
import { SleepModeService } from "./sleep-mode-service.ts";

beforeEach(() => {
  mock.clearAllMocks();
});

test("turning sleep mode on enables the expected adaptive-lighting sleep switches", async () => {
  let onTurnOn: (() => Promise<void>) | undefined;
  const turnOnAll = mock(async () => {});

  SleepModeService({
    automation: { time: { isAfter: () => false } },
    bens_flat: {
      helpers: { turnOffAll: mock(async () => {}), turnOnAll },
      lights: { turnOffAll: mock(async () => {}) },
      motion: { livingRoom: (_cb: () => Promise<void> | void) => {} },
    },
    context: {},
    hass: { socket: { onEvent: (_config: unknown) => {} } },
    logger: { info: mock(() => {}) },
    synapse: {
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
});
