import type { TServiceParams } from "@digital-alchemy/core";

export function CoreModule({ bens_flat }: TServiceParams) {
  const { motionLights } = bens_flat;

  motionLights.create({
    switchName: "Living room motion sensor",
    area: "living_room",
    sensorId: "binary_sensor.living_room_occupancy",
    timeout: "10m",
  });

  motionLights.create({
    switchName: "Halllway motion sensor",
    area: "hallway",
    sensorId: "binary_sensor.hallway_occupancy",
    timeout: "2m",
  });
}
