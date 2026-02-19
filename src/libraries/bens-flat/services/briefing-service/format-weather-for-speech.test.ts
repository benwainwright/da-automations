import { expect, mock, test } from "bun:test";
import { formatWeatherForSpeech } from "./format-weather-for-speech.ts";

test("formats weather state, rounded values, and compass direction", () => {
  const id = mock(() => ({
    attributes: {
      temperature: 17.6,
      wind_bearing: 95,
      wind_speed: 23.4,
    },
    state: "sunny",
  }));

  const result = formatWeatherForSpeech(
    {
      refBy: { id },
    } as any,
    "weather.home" as any,
  );

  expect(id).toHaveBeenCalledTimes(1);
  expect(id).toHaveBeenCalledWith("weather.home");
  expect(result).toBe(
    "The weather in Manchester is sunny and 18 degrees, with east winds at 23 kilometres per hour.",
  );
});

test("handles compass wrap-around for near-north bearings", () => {
  const result = formatWeatherForSpeech(
    {
      refBy: {
        id: () => ({
          attributes: {
            temperature: 2.4,
            wind_bearing: 359,
            wind_speed: 9.6,
          },
          state: "cloudy",
        }),
      },
    } as any,
    "weather.home" as any,
  );

  expect(result).toBe(
    "The weather in Manchester is cloudy and 2 degrees, with north winds at 10 kilometres per hour.",
  );
});
