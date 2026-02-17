import { beforeEach, expect, mock, test } from "bun:test";
import { MotionService } from "./motion-service.ts";

type UpdateCallback = (newState?: { state?: string }) => Promise<void> | void;

const makeHarness = () => {
  const callbacks = new Map<string, UpdateCallback>();
  const makeEntity = (id: string) => ({
    onUpdate: (callback: UpdateCallback) => {
      callbacks.set(id, callback);
      return { remove: () => {} };
    },
  });

  const hass = {
    refBy: {
      id: (id: string) => makeEntity(id),
    },
  };

  return {
    emit: async (id: string, state: string) => {
      await callbacks.get(id)?.({ state });
    },
    hass,
  };
};

beforeEach(() => {
  mock.clearAllMocks();
});

test("anywhere() only fires callback for motion on-state updates", async () => {
  const harness = makeHarness();
  const callback = mock(() => {});

  const motion = MotionService({ hass: harness.hass } as any);
  motion.anywhere(callback);

  await harness.emit("binary_sensor.bedroom_occupancy", "off");
  await harness.emit("binary_sensor.hallway_occupancy", "off");
  await harness.emit("binary_sensor.living_room_occupancy", "on");

  expect(callback).toHaveBeenCalledTimes(1);
});

test("bedroom() only fires callback when bedroom sensor is on", async () => {
  const harness = makeHarness();
  const callback = mock(() => {});

  const motion = MotionService({ hass: harness.hass } as any);
  motion.bedroom(callback);

  await harness.emit("binary_sensor.bedroom_occupancy", "off");
  await harness.emit("binary_sensor.bedroom_occupancy", "on");

  expect(callback).toHaveBeenCalledTimes(1);
});
