import "./utils";

import { LIB_AUTOMATION } from "@digital-alchemy/automation";
import { CreateApplication } from "@digital-alchemy/core";
import { LIB_HASS } from "@digital-alchemy/hass";
import { LIB_SYNAPSE } from "@digital-alchemy/synapse";
import { BENS_FLAT } from "@libraries";

const APP = CreateApplication({
  libraries: [LIB_HASS, LIB_SYNAPSE, LIB_AUTOMATION, BENS_FLAT],
  name: "app",
  services: {},
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    app: typeof APP;
  }
}

export { APP };
