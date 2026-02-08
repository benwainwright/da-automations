import { createModule } from "@digital-alchemy/core";
import { LIB_MOCK_ASSISTANT } from "@digital-alchemy/hass/mock-assistant";
import { LIB_MOCK_SYNAPSE } from "@digital-alchemy/synapse";
import { LIB_BENS_FLAT } from "@libraries";

export const hassTestRunner = createModule
  .fromLibrary(LIB_BENS_FLAT)
  .extend()
  .toTest()
  .setOptions({
    configSources: { argv: false, env: false, file: false },
  })
  .configure({
    synapse: {
      DATABASE_TYPE: "sqlite",
      DATABASE_URL: ":memory:",
      EMIT_HEARTBEAT: false,
    },
  })
  .appendLibrary(LIB_MOCK_SYNAPSE)
  .appendLibrary(LIB_MOCK_ASSISTANT);

export { hassTestRunner as testRunner };
