import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateLibrary } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";
import {
  BlindsService,
  CalendarService,
  CoreModule,
  GoingHomeRecorderService,
  MediaPlayerService,
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
  BriefingService,
  VisitorModeService,
  AlexaMediaPlayerService,
  SyncTvService,
  EmailService,
  SchedulerService,
  TodoListService,
  BoilerService,
  EntityIdService,
} from "./services/index.ts";
import { LIB_LEARNING_SENSORS } from "../learning-sensors/learning-sensors.library.ts";
import { LIB_NUKI } from "../nuki/nuki.library.ts";

export const LIB_BENS_FLAT = CreateLibrary({
  depends: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION, LIB_LEARNING_SENSORS, LIB_NUKI],
  name: "bens_flat",
  priorityInit: [
    "entityIds",
    "notify",
    "calender",
    "mediaPlayer",
    "alexa",
    "nags",
    "scene",
    "helpers",
    "motion",
    "sleepMode",
    "tvMode",
    "todoList",
    "briefing",
    "blinds",
    "lights",
    "goingHomeRecorder",
  ],
  services: {
    todoList: TodoListService,
    boiler: BoilerService,
    nags: NagService,
    email: EmailService,
    music: MusicService,
    //lock: LockService,
    calender: CalendarService,
    alexa: AlexaMediaPlayerService,
    visitor: VisitorModeService,
    entityIds: EntityIdService,
    scheduler: SchedulerService,
    motion: MotionService,
    blinds: BlindsService,
    plants: PlantsService,
    mediaPlayer: MediaPlayerService,
    briefing: BriefingService,
    scene: SceneService,
    tvMode: TVModeService,
    tv: SyncTvService,
    presence: PresenceDetectionService,
    lights: LightsService,
    sleepMode: SleepModeService,
    goingHomeRecorder: GoingHomeRecorderService,
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
