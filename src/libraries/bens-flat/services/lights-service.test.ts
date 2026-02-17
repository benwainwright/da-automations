import { expect, mock, test } from "bun:test";
import { LightsService } from "./lights-service.ts";

test("flash() targets each expected area once", async () => {
  const turnOn = mock(async () => {});

  const service = LightsService({
    bens_flat: {
      helpers: {
        turnOffAll: mock(async () => {}),
      },
    },
    context: {},
    hass: {
      call: {
        light: {
          turn_on: turnOn,
        },
      },
      refBy: {
        domain: () => [],
        id: () => ({}),
      },
    },
    logger: { info: mock(() => {}) },
    scheduler: { setTimeout: () => ({ remove: () => {} }) },
    synapse: {
      switch: () => ({
        getEntity: () => ({ state: "on" }),
      }),
    },
  } as any);

  await service.flash();

  expect(turnOn).toHaveBeenCalledWith({
    effect: "okay",
    area_id: ["bathroom", "bedroom", "hallway", "spare_room"],
  });
});

test("setupMotionTrigger does not throw when motion switch entity is unavailable", async () => {
  const turnOn = mock(async () => {});
  const warn = mock(() => {});
  let onUpdate: ((newState: { state: string }) => Promise<void>) | undefined;

  const service = LightsService({
    bens_flat: {
      helpers: {
        turnOffAll: mock(async () => {}),
      },
    },
    context: {},
    hass: {
      call: {
        light: {
          turn_on: turnOn,
          turn_off: mock(async () => {}),
        },
      },
      refBy: {
        domain: () => [],
        id: () => ({
          onUpdate: (callback: (newState: { state: string }) => Promise<void>) => {
            onUpdate = callback;
          },
          state: "off",
        }),
      },
    },
    logger: { info: mock(() => {}), warn },
    scheduler: { setTimeout: () => ({ remove: () => {} }) },
    synapse: {
      switch: () => ({
        getEntity: () => undefined,
      }),
    },
  } as any);

  service.setupMotionTrigger({
    area: "bathroom",
    sensorId: "binary_sensor.bathroom_occupancy",
    switchName: "Bathroom motion sensor",
    timeout: "2m",
  });

  await onUpdate?.({ state: "on" });

  expect(turnOn).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalled();
});
