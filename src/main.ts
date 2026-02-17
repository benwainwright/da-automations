import { APP } from "./app.module.ts";

void APP.bootstrap({
  bootLibrariesFirst: false,
  configuration: {
    boilerplate: {
      LOG_LEVEL: "info",
    },
    synapse: {
      HEARTBEAT_INTERVAL: 30,
      METADATA_UNIQUE_ID: "1971e4ed-1a2c-4c24-b3a0-503c87d142ef",
      REBUILD_ON_ENTITY_CHANGE: true,
    },
  },
});
