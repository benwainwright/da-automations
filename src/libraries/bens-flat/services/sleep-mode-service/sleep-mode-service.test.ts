import { beforeEach, expect, mock, test } from "bun:test";
import { SleepModeService } from "./sleep-mode-service.ts";

beforeEach(() => {
  mock.clearAllMocks();
});

function setupSleepModeService() {
  const actions: string[] = [];
  let onTurnOn: (() => Promise<void>) | undefined;
  const cron = mock((_config: unknown) => {});
  const setForFirstEventOfNextDay = mock(async () => {});
  const turnOnAll = mock(async () => {});
  const turnOffSwitch = mock(async ({ entity_id }: { entity_id: string }) => {
    actions.push(`switch.turn_off:${entity_id}`);
  });

  SleepModeService({
    automation: { time: { isAfter: () => false, isBefore: () => false } },
    bens_flat: {
      alarm: { setForFirstEventOfNextDay },
      iMac: { shutdown: mock() },
      briefing: {
        read: mock(async () => true),
        remindersSwitch: { is_on: false },
        reset: mock(() => {}),
        todoList: mock(async () => {}),
      },
      helpers: { turnOffAll: mock(async () => {}), turnOnAll },
      entityIds: {
        switches: {
          adaptiveLightingSleepModeBathroom: "switch.adaptive_lighting_sleep_mode_bathroom",
          adaptiveLightingSleepModeBedroom: "switch.adaptive_lighting_sleep_mode_bedroom",
          adaptiveLightingSleepModeHallway: "switch.adaptive_lighting_sleep_mode_hallway",
          adaptiveLightingSleepModeLivingRoom: "switch.adaptive_lighting_sleep_mode_living_room",
          adaptiveLightingSleepModeSpareRoom: "switch.adaptive_lighting_sleep_mode_spare_room",
          autoplayMusic: "switch.autoplay_music",
          bedroomMotionSensor: "switch.bedroom_motion_sensor",
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
      lights: {
        turnOffAll: mock(async () => {
          actions.push("lights.turnOffAll");
        }),
      },
      motion: {
        anywhere: (_cb: () => Promise<void> | void) => {},
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
    scheduler: { cron },
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

  return {
    actions,
    cron,
    onTurnOn,
    setForFirstEventOfNextDay,
    turnOffSwitch,
    turnOnAll,
  };
}

test("turning sleep mode on enables the expected adaptive-lighting sleep switches", async () => {
  const { actions, cron, onTurnOn, setForFirstEventOfNextDay, turnOffSwitch, turnOnAll } =
    setupSleepModeService();

  await onTurnOn?.();

  expect(cron).toHaveBeenCalledTimes(1);
  expect(turnOnAll).toHaveBeenCalledTimes(1);
  expect(turnOnAll).toHaveBeenCalledWith([
    "switch.adaptive_lighting_sleep_mode_bathroom",
    "switch.adaptive_lighting_sleep_mode_bedroom",
    "switch.adaptive_lighting_sleep_mode_hallway",
    "switch.adaptive_lighting_sleep_mode_living_room",
    "switch.adaptive_lighting_sleep_mode_spare_room",
  ]);
  expect(setForFirstEventOfNextDay).toHaveBeenCalledTimes(1);
  expect(turnOffSwitch).toHaveBeenCalledWith({ entity_id: "switch.autoplay_music" });
  expect(actions).toContain("switch.turn_off:switch.bedroom_motion_sensor");
  expect(actions).toContain("lights.turnOffAll");
});
