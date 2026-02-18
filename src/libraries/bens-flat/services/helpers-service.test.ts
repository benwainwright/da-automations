import { expect, test } from "bun:test";
import { HelpersService } from "./helpers.ts";

test("allAreas includes each room exactly once including spare_room", () => {
  const helpers = HelpersService({
    hass: {},
    scheduler: {},
  } as any);

  expect(helpers.allAreas).toEqual(["bathroom", "bedroom", "hallway", "living_room", "spare_room"]);
});

test("latch only allows one in-flight callback until reset", async () => {
  let calls = 0;
  const resolves: Array<() => void> = [];
  const callback = () =>
    new Promise<void>((accept) => {
      calls += 1;
      resolves.push(accept);
    });

  const helpers = HelpersService({
    hass: {},
    scheduler: {},
  } as any);
  const { trigger, reset } = helpers.latch(callback);

  const first = trigger();
  await trigger();
  expect(calls).toBe(1);

  resolves[0]?.();
  await first;

  await reset();
  const second = trigger();
  expect(calls).toBe(2);
  resolves[1]?.();
  await second;
});
