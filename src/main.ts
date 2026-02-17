import { APP } from "./app.module.ts";

void APP.bootstrap({
  bootLibrariesFirst: false,
  configuration: {
    boilerplate: {
      LOG_LEVEL: "info",
    },
    synapse: {
      HEARTBEAT_INTERVAL: 30,
      METADATA_UNIQUE_ID: "551e4cc1-3a68-460e-a3ff-9f70ba752c46",
      ENTITY_CLEANUP_METHOD: "delete",
      REBUILD_ON_ENTITY_CHANGE: true,
    },
  },
});
