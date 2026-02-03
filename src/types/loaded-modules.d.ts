import "@digital-alchemy/core";

declare module "@digital-alchemy/core" {
  interface LoadedModules {
    bens_flat: (typeof import("../app.module"))["HOME_AUTOMATION"];
  }
}
