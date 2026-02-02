import {
  ApplicationDefinition,
  OptionalModuleConfiguration,
  ServiceFunction,
} from "@digital-alchemy/core";
import type { MotionLightsService } from "./services/lights.mts";
import type { TVModeService } from "./services/tv-mode";
import { SleepMode } from "./services/sleep-mode.mts";

type HomeAutomationServices = {
  tvMode: typeof TVModeService;
  lights: typeof MotionLightsService;
  sleepMode: typeof SleepMode;
  core: ServiceFunction;
};

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    bens_flat: ApplicationDefinition<HomeAutomationServices, OptionalModuleConfiguration>;
  }
}

export {};
