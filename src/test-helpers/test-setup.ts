import { generateHassFixtures } from "./generate-hass-fixtures.ts";

if (process.env["SKIP_HASS_FIXTURE_SETUP"] !== "1") {
  await generateHassFixtures();
}
