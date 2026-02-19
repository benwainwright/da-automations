import { expect, test } from "bun:test";
import { degreesToCompass } from "./degrees-to-compass.ts";

test("maps cardinal and diagonal directions", () => {
  const cases = [
    { degrees: 0, expected: "north" },
    { degrees: 45, expected: "north-east" },
    { degrees: 90, expected: "east" },
    { degrees: 135, expected: "south-east" },
    { degrees: 180, expected: "south" },
    { degrees: 225, expected: "south-west" },
    { degrees: 270, expected: "west" },
    { degrees: 315, expected: "north-west" },
  ];

  for (const { degrees, expected } of cases) {
    expect(degreesToCompass(degrees)).toBe(expected);
  }
});

test("uses Math.round boundaries and wraps around to north", () => {
  expect(degreesToCompass(22)).toBe("north");
  expect(degreesToCompass(23)).toBe("north-east");
  expect(degreesToCompass(67)).toBe("north-east");
  expect(degreesToCompass(68)).toBe("east");
  expect(degreesToCompass(359)).toBe("north");
  expect(degreesToCompass(360)).toBe("north");
});
