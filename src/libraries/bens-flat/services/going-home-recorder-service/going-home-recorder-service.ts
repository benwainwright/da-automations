import { TServiceParams } from "@digital-alchemy/core";
import { GoingHomeRecorderTrainer } from "./going-home-recorder-trainer.ts";

export function GoingHomeRecorderService({ hass, learning_sensors }: TServiceParams) {
  const trainer = new GoingHomeRecorderTrainer(hass);

  learning_sensors.sensor.makeSensor("going-home", trainer, "5m");
}
