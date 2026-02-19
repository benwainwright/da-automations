import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";
import { degreesToCompass } from "./degrees-to-compass.ts";

export const formatWeatherForSpeech = (
  hass: TServiceParams["hass"],
  weather: PICK_ENTITY<"weather">,
) => {
  const { state, attributes } = hass.refBy.id(weather);

  const temperature = Math.round(attributes.temperature);
  const windSpeed = Math.round(attributes.wind_speed);
  const windDirection = degreesToCompass(attributes.wind_bearing);

  return `The weather in Manchester is ${state} and ${temperature} degrees, with ${windDirection} winds at ${windSpeed} kilometres per hour.`;
};
