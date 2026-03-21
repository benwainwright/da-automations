import { CreateLibrary } from "@digital-alchemy/core";
import { ApiService } from "./services/api-service/api-service.ts";

export const LIB_NUKI = CreateLibrary({
  depends: [],
  name: "nuki",
  priorityInit: ["api"],
  configuration: {
    NUKI_API_TOKEN: {
      description: "Token for the Nuki web API",
      required: true,
      type: "string",
    },
  },
  services: {
    api: ApiService,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    nuki: typeof LIB_NUKI;
  }
}
