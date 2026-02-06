import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateLibrary } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";
import {
  BlindsService,
  CoreModule,
  HelpersService,
  LightsService,
  MotionService,
  MusicService,
  PresenceDetectionService,
  SleepModeService,
  TVModeService,
} from "@services";

export const BENS_FLAT = CreateLibrary({
  depends: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION],
  name: "bens_flat",
  priorityInit: ["motion", "blinds", "helpers", "lights", "sleepMode", "tvMode"],
  services: {
    music: MusicService,
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
    bens_flat: typeof BENS_FLAT;
  }
}
