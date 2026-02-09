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
  NotificationService,
  NagService,
  PlantsService,
  SceneService,
} from "./services/index.ts";

export const LIB_BENS_FLAT = CreateLibrary({
  depends: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION],
  name: "bens_flat",
  priorityInit: ["scene", "motion", "blinds", "helpers", "lights", "sleepMode", "tvMode"],

  services: {
    nags: NagService,
    music: MusicService,
    motion: MotionService,
    blinds: BlindsService,
    plants: PlantsService,
    scene: SceneService,
    tvMode: TVModeService,
    presence: PresenceDetectionService,
    lights: LightsService,
    sleepMode: SleepModeService,
    notify: NotificationService,
    core: CoreModule,
    helpers: HelpersService,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    bens_flat: typeof LIB_BENS_FLAT;
  }
}
