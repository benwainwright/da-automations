import "./utils";

import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";
import { MotionLightsService } from "./services/lights.mts";
import { TVModeService } from "./services/tv-mode";
import { SleepMode } from "./services/sleep-mode.mts";
import { CoreModule } from "./services/core.mts";

export const HOME_AUTOMATION = CreateApplication({
  configuration: {},
  libraries: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION],
  name: "bens_flat",
  priorityInit: ["tvMode", "lights", "sleepMode", "core"],
  services: {
    tvMode: TVModeService,
    lights: MotionLightsService,
    sleepMode: SleepMode,
    core: CoreModule,
  },
});
