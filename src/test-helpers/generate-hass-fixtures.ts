import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { execa } from "execa";

export const generateHassFixtures = async () => {
  const fixturesPath = join(process.cwd(), "fixtures.json");
  const shouldRegenerate = process.env["REBUILD_HASS_FIXTURES"] === "1";

  if (!shouldRegenerate && existsSync(fixturesPath)) {
    return;
  }

  const path = Bun.resolveSync("@digital-alchemy/hass", import.meta.dir);

  const thePath = join(dirname(path), "mock_assistant", "main.mjs");

  process.env["LOG_LEVEL"] = "info";

  try {
    await execa`bun run ${thePath}`;
    console.log(`Generated fixtures.json`);
  } catch (error) {
    if (existsSync(fixturesPath)) {
      console.warn(
        `Unable to regenerate fixtures.json, using existing local fixture data instead.`,
      );
      return;
    }
    throw error;
  }
};
