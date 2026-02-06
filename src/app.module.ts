import "./utils";

import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";

import { PresenceDetectionService } from "./services/presence-detection-service.ts";
import { TVModeService } from "./services/tv-mode-service.ts";
import { LightsService } from "./services/lights-service.ts";
import { SleepModeService } from "./services/sleep-mode-service.ts";
import { CoreModule } from "./services/core.ts";
import { HelpersService } from "./services/helpers.ts";
import { BlindsService } from "@services";
import { MotionService } from "./services/motion-service.ts";

const HOME_AUTOMATION = CreateApplication({
  configuration: {},
  libraries: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION],
  name: "bens_flat",
  priorityInit: ["motion", "blinds", "helpers", "lights", "sleepMode"],
  services: {
    motion: MotionService,
    blinds: BlindsService,
    tvMode: TVModeService,
    presence: PresenceDetectionService,
    lights: LightsService,
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
