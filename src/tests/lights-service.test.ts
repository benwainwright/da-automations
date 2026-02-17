import { expect, mock, test } from "bun:test";
import { LightsService } from "../libraries/bens-flat/services/lights-service.ts";

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
