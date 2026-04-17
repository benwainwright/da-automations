import { beforeEach, expect, mock, test } from "bun:test";
import { BriefingService } from "./briefing-service.ts";

beforeEach(() => {
  mock.clearAllMocks();
});

test("morning briefing turns bedroom motion sensor back on", async () => {
  let livingRoomMotion: (() => Promise<void> | void) | undefined;
  const turnOnSwitch = mock(async () => {});
  const latch = (callback: () => Promise<void> | void) => ({
    trigger: async () => {
      await callback();
    },
    reset: async () => {},
  });

  BriefingService({
    automation: {
      time: {
        isAfter: () => true,
        isBefore: () => true,
      },
    },
    bens_flat: {
      calendar: { toString: mock(async () => "no events") },
      entityIds: {
        mediaPlayers: { wholeFlat: "media_player.whole_flat" },
        switches: {
          autoplayMusic: "switch.autoplay_music",
          bedroomMotionSensor: "switch.bedroom_motion_sensor",
        },
      },
      helpers: {
        latch,
        timedLatch: () => ({ trigger: mock(async () => {}) }),
      },
      mediaPlayer: { play: mock(async () => {}) },
      motion: {
        anywhere: (_callback: () => Promise<void> | void) => {},
        bathroom: (_callback: () => Promise<void> | void) => {},
        hallway: (_callback: () => Promise<void> | void) => {},
        livingRoom: (callback: () => Promise<void> | void) => {
          livingRoomMotion = callback;
        },
      },
      notify: {
        speak: mock(async () => {}),
      },
      sleepMode: {
        isOn: () => false,
        sleepModeSwitch: { onTurnOn: (_callback: () => Promise<void> | void) => {} },
      },
      todoList: { toString: mock(async () => undefined) },
      tvMode: { isOn: () => false },
      visitor: { visitorMode: { getEntity: () => ({ state: "off" }) } },
    },
    context: {},
    hass: {
      call: {
        media_player: { shuffle_set: mock(async () => {}) },
        switch: { turn_on: turnOnSwitch },
      },
      refBy: {
        id: () => ({
          state: "cloudy",
          attributes: { temperature: 12, wind_bearing: 90, wind_speed: 8 },
        }),
      },
    },
    logger: { info: mock(() => {}) },
    synapse: {
      button: () => ({ onPress: (_callback: () => Promise<void>) => {} }),
      switch: () => ({ is_on: false }),
    },
  } as any);

  await livingRoomMotion?.();

  expect(turnOnSwitch).toHaveBeenCalledWith({ entity_id: "switch.bedroom_motion_sensor" });
  expect(turnOnSwitch).toHaveBeenCalledWith({ entity_id: "switch.autoplay_music" });
});
