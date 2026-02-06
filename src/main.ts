import { APP } from "./app.module.ts";

void APP.bootstrap({
  bootLibrariesFirst: false,
  configuration: {
    boilerplate: {
      LOG_LEVEL: "info",
    },
    synapse: {
      METADATA_UNIQUE_ID: "532be3cf-5023-49bd-95f4-f3abfc1b0357",
    },
  },
});
