import { CreateLibrary } from "@digital-alchemy/core";

export const LIB_AUTO_DEPLOY = CreateLibrary({
  depends: [],
  name: "test_utils",
  priorityInit: [],
  services: {},
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    test_utils: typeof LIB_AUTO_DEPLOY;
  }
}
