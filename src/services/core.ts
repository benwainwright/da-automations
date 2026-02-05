import { type TServiceParams } from "@digital-alchemy/core";

export function CoreModule({ bens_flat, hass, lifecycle }: TServiceParams) {
  const { motionLights, sleepMode, tvMode, presence } = bens_flat;
  lifecycle.onReady(() => {
    motionLights.create({
      switchName: "Living room motion sensor",
      area: "living_room",
      sensorId: "binary_sensor.living_room_occupancy",
      blockSwitches: [tvMode.tvModeSwitch.entity_id],
      timeout: "10m",
    });

    motionLights.create({
      switchName: "Halllway motion sensor",
      area: "hallway",
      sensorId: "binary_sensor.hallway_occupancy",
      timeout: "2m",
    });

    motionLights.create({
      switchName: "Bedroom motion sensor",
      area: "bedroom",
      blockSwitches: [sleepMode.sleepModeSwitch.entity_id],
      sensorId: "binary_sensor.bedroom_occupancy",
      timeout: "10m",
    });

    motionLights.create({
      switchName: "Bathroom motion sensor",
      area: "bathroom",
      sensorId: "binary_sensor.bathroom_occupancy",
      timeout: "2m",
    });

    presence.flatIsOccupied.onUpdate(async (newState, oldState) => {
      if (oldState.state === "on" && newState.state === "off") {
        const allLights = hass.refBy.domain("light").map((entity) => entity.entity_id);
        await hass.call.light.turn_off({ entity_id: allLights });
        await hass.call.cover.close_cover({ entity_id: "cover.living_room_blinds" });
      }
    });
  });
}
