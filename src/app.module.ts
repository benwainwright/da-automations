import "./utils";

import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";
import { CoreModule } from "./services/core.ts";
import { TVModeService } from "./services/tv-mode-service.ts";
import { CreateMotionLightService } from "./services/create-motion-lights-service.ts";
import { SleepModeService } from "./services/sleep-mode-service.ts";

const HOME_AUTOMATION = CreateApplication({
  configuration: {},
  libraries: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION],
  name: "bens_flat",
  services: {
    tvMode: TVModeService,
    motionLights: CreateMotionLightService,
    sleepMode: SleepModeService,
    core: CoreModule,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    bens_flat: typeof HOME_AUTOMATION;
  }
}

export { HOME_AUTOMATION };
