import { dirname, join } from "node:path";

export const generateHassFixtures = async () => {
  const path = Bun.resolveSync("@digital-alchemy/hass", import.meta.dir);

  const thePath = join(dirname(path), "mock_assistant", "main.mjs");

  process.env["LOG_LEVEL"] = "info";

  await import(thePath);
};
