import { type TServiceParams } from "@digital-alchemy/core";

export function CoreModule({ bens_flat, lifecycle }: TServiceParams) {
  const { lights, sleepMode, tvMode, presence, blinds } = bens_flat;
  lifecycle.onReady(() => {
    lights.setupMotionTrigger({
      switchName: "Living room motion sensor",
      area: "living_room",
      sensorId: "binary_sensor.living_room_occupancy",
      blockSwitches: [tvMode.tvModeSwitch.entity_id],
      timeout: "30m",
    });

    lights.setupMotionTrigger({
      switchName: "Halllway motion sensor",
      area: "hallway",
      sensorId: "binary_sensor.hallway_occupancy",
      timeout: "2m",
    });

    lights.setupMotionTrigger({
      switchName: "Spare room motion sensor",
      area: "spare_room",
      sensorId: "binary_sensor.spare_room_occupancy",
      timeout: "5m",
    });

    lights.setupMotionTrigger({
      switchName: "Bedroom motion sensor",
      area: "bedroom",
      blockSwitches: [sleepMode.sleepModeSwitch.getEntity().entity_id],
      sensorId: "binary_sensor.bedroom_occupancy",
      timeout: "10m",
    });

    lights.setupMotionTrigger({
      switchName: "Bathroom motion sensor",
      area: "bathroom",
      sensorId: "binary_sensor.bathroom_occupancy",
      timeout: "2m",
    });

    presence.flatIsOccupied.getEntity().onUpdate(async (newState, oldState) => {
      if (!newState) return;
      if (oldState.state === "on" && newState.state === "off") {
        await lights.turnOffAll();
        await blinds.close();
      } else if (oldState.state === "off" && newState.state === "on") {
        await blinds.openIfDefaultIsOpen();
      }
    });

    tvMode.tvModeSwitch.getEntity().onUpdate(async (newState, oldState) => {
      if (!newState) return;
      if (oldState.state === "off" && newState.state === "on") {
        await blinds.close();
      } else if (oldState.state === "on" && newState.state === "off") {
        await blinds.openIfDefaultIsOpen();
      }
    });
  });
}
