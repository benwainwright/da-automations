import { afterEach, expect, setSystemTime, test } from "bun:test";
import dayjs from "dayjs";
import { getDateAndTimeString } from "./get-day-and-time-string.ts";

afterEach(() => {
  setSystemTime();
});

test("returns a readable date and time sentence", () => {
  setSystemTime(new Date("2026-03-21T09:41:00"));

  expect(getDateAndTimeString()).toBe(
    `The time is ${dayjs().format("h:mm A")} on ${dayjs().format("dddd")} the 21st of ${dayjs().format("MMMM")}.`,
  );
});

test("uses correct ordinal suffixes for day numbers", () => {
  const cases = [
    { dayNumber: 1, suffix: "st" },
    { dayNumber: 2, suffix: "nd" },
    { dayNumber: 3, suffix: "rd" },
    { dayNumber: 4, suffix: "th" },
    { dayNumber: 11, suffix: "th" },
    { dayNumber: 12, suffix: "th" },
    { dayNumber: 13, suffix: "th" },
    { dayNumber: 21, suffix: "st" },
    { dayNumber: 22, suffix: "nd" },
    { dayNumber: 23, suffix: "rd" },
    { dayNumber: 31, suffix: "st" },
  ];

  for (const { dayNumber, suffix } of cases) {
    setSystemTime(new Date(`2026-01-${String(dayNumber).padStart(2, "0")}T08:00:00`));

    expect(getDateAndTimeString()).toContain(`the ${dayNumber}${suffix} of`);
  }
});
