import "./utils";

import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";
import { LIB_BENS_FLAT } from "@libraries";
import { LIB_AUTO_DEPLOY } from "./libraries/auto-deploy/auto-deploy.library.ts";
import { LIB_LEARNING_SENSORS } from "./libraries/learning-sensors/learning-sensors.library.ts";

const APP = CreateApplication({
  libraries: [
    LIB_HASS,
    LIB_SYNAPSE,
    LIB_AUTOMATION,
    LIB_BENS_FLAT,
    LIB_AUTO_DEPLOY,
    LIB_LEARNING_SENSORS,
  ],
  name: "app",
  services: {},
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    app: typeof APP;
  }
}

export { APP };
