import { HOME_AUTOMATION } from "./app.module.ts";

void HOME_AUTOMATION.bootstrap({
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
