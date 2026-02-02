import type { TServiceParams } from "@digital-alchemy/core";

export const CoreModule = ({ bens_flat: { lights } }: TServiceParams) => {
  lights.motionControlledLight({
    switchName: "Bedroom motion sensor",
    lightId: "light.bedroom",
    sensorId: "binary_sensor.bedroom_sensor_sensor_state_motion",
    blockSwitches: ["switch.sleep_mode"],
    timeout: "2m",
  });

  lights.motionControlledLight({
    switchName: "Living room motion sensor",
    lightId: "light.living_room",
    sensorId: "binary_sensor.living_room_sensor_sensor_state_motion",
    blockSwitches: ["switch.tv_mode"],
    timeout: "10m",
  });

  lights.motionControlledLight({
    switchName: "Bathroom motion sensor",
    lightId: "light.main_bathroom",
    sensorId: "binary_sensor.bathroom_motion_sensor_occupancy",
    timeout: "2m",
  });

  lights.motionControlledLight({
    switchName: "Hallway motion sensor",
    lightId: "light.hallway",
    sensorId: "binary_sensor.hallway_motion_sensor_occupancy",
    timeout: "2m",
  });
};
