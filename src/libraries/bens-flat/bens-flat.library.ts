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
  CdService,
} from "./services/index.ts";
import { LIB_LEARNING_SENSORS } from "../learning-sensors/learning-sensors.library.ts";
import { LIB_NUKI } from "../nuki/nuki.library.ts";
import { generateServiceMapWithPriorities } from "./service-manager.ts";
import { LockService } from "./services/lock-service/lock-service.ts";
import { PodcastService } from "./services/podcasts/podcast-service.ts";

const { services, priorityInit } = generateServiceMapWithPriorities({
  services: {
    lock: { func: LockService, dependencies: ["entityIds"] },
    tv: { func: SyncTvService, dependencies: ["entityIds"] },
    boiler: {
      func: BoilerService,
      dependencies: ["entityIds"],
    },
    music: {
      func: MusicService,
      dependencies: ["tvMode", "motion", "mediaPlayer", "sleepMode", "entityIds"],
    },
    notify: {
      func: NotificationService,
      dependencies: ["lights", "mediaPlayer", "entityIds"],
    },
    calendar: {
      func: CalendarService,
      dependencies: ["entityIds", "notify"],
    },
    cd: {
      func: CdService,
      dependencies: ["notify", "motion", "mediaPlayer", "lock", "entityIds", "scene"],
    },
    alexa: {
      func: AlexaMediaPlayerService,
      dependencies: ["mediaPlayer"],
    },
    lights: {
      func: LightsService,
      dependencies: ["helpers"],
    },
    briefing: {
      func: BriefingService,
      dependencies: [
        "notify",
        "helpers",
        "visitor",
        "mediaPlayer",
        "calendar",
        "todoList",
        "cd",
        "entityIds",
        "sleepMode",
        "motion",
        "tvMode",
      ],
    },
    todoList: { func: TodoListService, dependencies: ["calendar", "notify"] },
    helpers: HelpersService,
    visitor: VisitorModeService,
    presence: {
      func: PresenceDetectionService,
      dependencies: ["motion", "helpers", "entityIds"],
    },
    goingHomeRecorder: GoingHomeRecorderService,
    core: {
      func: CoreModule,
      dependencies: ["notify", "blinds", "presence", "lights", "entityIds", "sleepMode", "tvMode"],
    },
    nags: {
      func: NagService,
      dependencies: ["notify"],
    },
    email: EmailService,
    scene: SceneService,
    motion: {
      func: MotionService,
      dependencies: ["entityIds"],
    },
    blinds: {
      func: BlindsService,
      dependencies: ["entityIds", "motion", "cd"],
    },
    entityIds: EntityIdService,
    mediaPlayer: MediaPlayerService,
    tvMode: {
      func: TVModeService,
      dependencies: ["blinds", "scene", "entityIds"],
    },
    scheduler: {
      func: SchedulerService,
      dependencies: ["scene", "email", "entityIds", "briefing", "todoList"],
    },
    plants: {
      func: PlantsService,
      dependencies: ["nags", "entityIds"],
    },
    podcasts: PodcastService,
    sleepMode: {
      func: SleepModeService,
      dependencies: [
        "helpers",
        "lights",
        "motion",
        "visitor",
        "calendar",
        "notify",
        "alexa",
        "entityIds",
      ],
    },
  },
});

export const LIB_BENS_FLAT = CreateLibrary({
  depends: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION, LIB_LEARNING_SENSORS, LIB_NUKI],
  name: "bens_flat",
  configuration: {
    TODOIST_TOKEN: {
      description: "Todoist API token used to reschedule open tasks",
      required: true,
      type: "string",
    },
  },
  priorityInit,
  services,
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    bens_flat: typeof LIB_BENS_FLAT;
  }
}
