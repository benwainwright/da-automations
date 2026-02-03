import "./utils";

import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";
import { CreateMotionLightService, SleepModeService, TVModeService } from "@services";
import { CoreModule } from "./services/core";

export const HOME_AUTOMATION = CreateApplication({
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
