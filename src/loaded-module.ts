import type {
  ApplicationDefinition,
  OptionalModuleConfiguration,
  ServiceFunction,
} from "@digital-alchemy/core";
import { CreateMotionLightService, SleepModeService, TVModeService } from "@services";

type HomeAutomationServices = {
  tvMode: typeof TVModeService;
  motionLights: typeof CreateMotionLightService;
  sleepMode: typeof SleepModeService;
  core: ServiceFunction;
};

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    bens_flat: ApplicationDefinition<HomeAutomationServices, OptionalModuleConfiguration>;
  }
}

export {};
