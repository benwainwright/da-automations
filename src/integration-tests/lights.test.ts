import { testRunner } from "@test-helpers";
import { test, afterEach, spyOn, expect } from "bun:test";

afterEach(async () => {
  await testRunner.teardown();
});

test("light in the living room turns on when there is motion", () => {
  testRunner
    .bootLibrariesFirst()
    .setup(({ mock_assistant }) => {
      mock_assistant.entity.setupState({
        "binary_sensor.living_room_occupancy": { state: "off" },
      });
    })
    .run(({ mock_assistant, hass }) => {
      mock_assistant.entity.emitChange("binary_sensor.living_room_occupancy", { state: "on" });

      const turnOnSpy = spyOn(hass.call.light, "turn_on");

      expect(turnOnSpy).toHaveBeenCalledWith({ entity_id: "light.living_room" });
    });
});
