import { TServiceParams } from "@digital-alchemy/core";

export function TVModeService({ hass, synapse, context, logger }: TServiceParams) {
  const tvMode = synapse.switch({
    name: "TV Mode",
    context,
    unique_id: "tv_mode_switch",
    suggested_object_id: "tv_mode",
    icon: "mdi:television",
  });

  const xboxInGame = hass.refBy.id("binary_sensor.xbox_network_in_game");
  const appleTv = hass.refBy.id("media_player.apple_tv");

  xboxInGame.onUpdate(async (oldState, newState) => {
    if (oldState.state === "off" && newState.state === "on") {
      await tvMode.getEntity().turn_on();
    } else if (oldState.state === "on" && newState.state === "off") {
      await tvMode.getEntity().turn_off();
    }
  });

  // ps5Console.onUpdate(async (oldState, newState) => {
  //   if (oldState.state === "off" && newState.state === "on") {
  //     await tvMode.getEntity().turn_on();
  //   } else if (oldState.state === "on" && newState.state === "off") {
  //     await tvMode.getEntity().turn_off();
  //   }
  // });

  appleTv.onUpdate(async (oldState, newState) => {
    if (!newState) {
      return;
    }
    const attributes = newState.attributes as (typeof newState)["attributes"] & {
      app_id: string;
    };

    const isYoutube = attributes.app_id === "com.google.ios.youtube";
    const isSpotify = attributes.app_id === "com.spotify.client";

    if (oldState.state === "off" && newState.state === "on" && !isYoutube && !isSpotify) {
      await tvMode.getEntity().turn_on();
    } else if (oldState.state === "on" && newState.state === "off") {
      await tvMode.getEntity().turn_off();
    }
  });

  const isOn = () => {
    const tvModeState = Boolean(tvMode.is_on);
    logger.info(`Checking tv mode is on: ${tvModeState}`);
    return tvModeState;
  };

  return { tvModeSwitch: tvMode, isOn };
}
