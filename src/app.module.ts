import "./utils";

import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";

import { CoreModule, CreateMotionLightService } from "@services";

const HOME_AUTOMATION = CreateApplication({
  configuration: {},
  libraries: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION],
  name: "bens_flat",
  services: {
    // tvMode: TVModeService,
    motionLights: CreateMotionLightService,
    // sleepMode: SleepModeService,
    core: CoreModule,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    bens_flat: typeof HOME_AUTOMATION;
  }
}

export { HOME_AUTOMATION };
