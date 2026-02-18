import { CreateLibrary } from "@digital-alchemy/core";
import { LearningSensorService } from "./services/learning-sensor-service.ts";

export const LIB_LEARNING_SENSORS = CreateLibrary({
  depends: [],
  name: "learning_sensors",
  priorityInit: [],
  configuration: {},
  services: {
    sensor: LearningSensorService,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    learning_sensors: typeof LIB_LEARNING_SENSORS;
  }
}
