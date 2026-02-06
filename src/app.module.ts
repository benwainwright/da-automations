import "./utils";

import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";
import { LIB_BENS_FLAT } from "@libraries";

const APP = CreateApplication({
  libraries: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION, LIB_BENS_FLAT],
  name: "app",
  services: {},
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    app: typeof APP;
  }
}

export { APP };
