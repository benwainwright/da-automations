import { expect, test } from "bun:test";
import { LIB_AUTO_DEPLOY } from "../libraries/auto-deploy/auto-deploy.library.ts";

test("auto deploy library wires all expected services including socketTrigger", () => {
  expect(LIB_AUTO_DEPLOY.name).toBe("auto_deploy");
  expect(LIB_AUTO_DEPLOY.priorityInit).toEqual(["deploy", "github", "socketTrigger", "webhook"]);
  expect(Object.keys(LIB_AUTO_DEPLOY.services)).toEqual([
    "socketTrigger",
    "webhook",
    "monitor",
    "github",
    "deploy",
  ]);
});
