import { expect, test } from "bun:test";
import { HelpersService } from "../libraries/bens-flat/services/helpers.ts";

test("allAreas includes each room exactly once including spare_room", () => {
  const helpers = HelpersService({
    hass: {},
    scheduler: {},
  } as any);

  expect(helpers.allAreas).toEqual(["bathroom", "bedroom", "hallway", "living_room", "spare_room"]);
});
