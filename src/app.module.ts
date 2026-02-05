import "./utils";

import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";

import { PresenceDetectionService } from "./services/presence-detection-service.ts";
import {
  CoreModule,
  CreateMotionLightService,
  HelpersService,
  SleepModeService,
  TVModeService,
} from "@services";

const HOME_AUTOMATION = CreateApplication({
  configuration: {},
  libraries: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION],
  name: "bens_flat",
  priorityInit: ["helpers", "motionLights", "sleepMode"],
  services: {
    tvMode: TVModeService,
    presence: PresenceDetectionService,
    motionLights: CreateMotionLightService,
    sleepMode: SleepModeService,
    core: CoreModule,
    helpers: HelpersService,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    bens_flat: typeof HOME_AUTOMATION;
  }
}

export { HOME_AUTOMATION };
