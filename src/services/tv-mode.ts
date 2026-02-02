import type { TServiceParams } from "@digital-alchemy/core";

export const TVModeService = ({ hass, synapse, context }: TServiceParams) => {
  const tvMode = synapse.switch({
    name: "TV Mode",
    context,
  });

  const xboxInGame = hass.refBy.id("binary_sensor.sordidhydra4706_in_game");
  const ps5Console = hass.refBy.id("media_player.wearing_clapper2_ps5_console");
  const appleTv = hass.refBy.id("media_player.bens_apple_tv");
  const tvModeSwitch = hass.refBy.id(tvMode.entity_id);

  xboxInGame.onUpdate(async (oldState, newState) => {
    if (oldState.state === "off" && newState.state === "on") {
      await tvModeSwitch.turn_on();
    } else if (oldState.state === "on" && newState.state === "off") {
      await tvModeSwitch.turn_off();
    }
  });

  ps5Console.onUpdate(async (oldState, newState) => {
    if (oldState.state === "off" && newState.state === "on") {
      await tvModeSwitch.turn_on();
    } else if (oldState.state === "on" && newState.state === "off") {
      await tvModeSwitch.turn_off();
    }
  });

  appleTv.onUpdate(async (oldState, newState) => {
    const attributes = newState.attributes as (typeof newState)["attributes"] & {
      app_id: string;
    };

    const isYoutube = attributes.app_id === "com.google.ios.youtube";
    const isSpotify = attributes.app_id === "com.spotify.client";

    if (oldState.state === "off" && newState.state === "on" && !isYoutube && !isSpotify) {
      await tvModeSwitch.turn_on();
    } else if (oldState.state === "on" && newState.state === "off") {
      await tvModeSwitch.turn_off();
    }
  });

  return { tvModeSwitch: tvMode };
};
