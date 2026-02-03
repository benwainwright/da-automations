import type { TServiceParams } from "@digital-alchemy/core";

export const CoreModule = ({ bens_flat }: TServiceParams) => {
  const { motionLights, sleepMode, tvMode } = bens_flat;
  motionLights.create({
    switchName: "Bedroom motion sensor",
    lightId: "light.bedroom",
    sensorId: "binary_sensor.bedroom_sensor_sensor_state_motion",
    blockSwitches: [sleepMode.sleepModeSwitch.entity_id],
    timeout: "2m",
  });

  motionLights.create({
    switchName: "Living room motion sensor",
    lightId: "light.living_room",
    sensorId: "binary_sensor.living_room_sensor_sensor_state_motion",
    blockSwitches: [tvMode.tvModeSwitch.entity_id],
    timeout: "10m",
  });

  motionLights.create({
    switchName: "Bathroom motion sensor",
    lightId: "light.main_bathroom",
    sensorId: "binary_sensor.bathroom_motion_sensor_occupancy",
    timeout: "2m",
  });

  motionLights.create({
    switchName: "Hallway motion sensor",
    lightId: "light.hallway",
    sensorId: "binary_sensor.hallway_motion_sensor_occupancy",
    timeout: "2m",
  });
};
