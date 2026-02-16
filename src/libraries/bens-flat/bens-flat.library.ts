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
  CalendarService,
} from "./services/index.ts";

export const LIB_BENS_FLAT = CreateLibrary({
  depends: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION],
  name: "bens_flat",
  priorityInit: ["scene", "motion", "blinds", "helpers", "lights", "sleepMode", "tvMode"],
  configuration: {
    GOOGLE_CALENDAR_TOKEN: {
      type: "string",
      required: false,
      description: "Google calendar API token",
    },
    GOOGLE_CALENDAR_ID: {
      type: "string",
      required: false,
      description: "ID of calendar to pull events from",
    },
  },
  services: {
    calendar: CalendarService,
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
