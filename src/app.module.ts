import "./utils";

import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";

import { PresenceDetectionService } from "./services/presence-detection-service.ts";
import { TVModeService } from "./services/tv-mode-service.ts";
import { CreateMotionLightService } from "./services/create-motion-lights-service.ts";
import { SleepModeService } from "./services/seep-mode-service.ts";
import { CoreModule } from "./services/core.ts";
import { HelpersService } from "./services/helpers.ts";

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
