import { TServiceParams } from "@digital-alchemy/core";

export function TVModeService({
  hass,
  synapse,
  context,
  logger,
  lifecycle,
  bens_flat: { scene },
}: TServiceParams) {
  const tvMode = synapse.switch({
    name: "TV Mode",
    context,
    unique_id: "tv_mode_switch",
    suggested_object_id: "tv_mode",
    icon: "mdi:television",
  });

  const xboxInGame = hass.refBy.id("binary_sensor.xbox_network_in_game");
  const appleTv = hass.refBy.id("media_player.apple_tv");
  const ps5NowPlaying = hass.refBy.id("sensor.ps5_now_playing");

  xboxInGame.onUpdate(async (newState, oldState) => {
    if (!newState) return;
    if (oldState.state === "off" && newState.state === "on") {
      await tvMode.getEntity().turn_on();
    } else if (oldState.state === "on" && newState.state === "off") {
      await tvMode.getEntity().turn_off();
    }
  });

  ps5NowPlaying.onUpdate(async (newState, oldState) => {
    if (!newState) return;
    if (oldState.state === "unknown" && newState.state !== "unknown") {
      await tvMode.getEntity().turn_on();
    } else if (oldState.state !== "unknown" && newState.state === "unknown") {
      await tvMode.getEntity().turn_off();
    }
  });

  appleTv.onUpdate(async (newState, oldState) => {
    if (!newState) {
      return;
    }
    const attributes = newState.attributes as (typeof newState)["attributes"] & {
      app_id: string;
    };

    const isYoutube = attributes.app_id === "com.google.ios.youtube";
    const isSpotify = attributes.app_id === "com.spotify.client";

    if (oldState.state !== "playing" && newState.state === "playing" && !isYoutube && !isSpotify) {
      await tvMode.getEntity().turn_on();
    } else if (oldState.state === "playing" && newState.state !== "playing") {
      await tvMode.getEntity().turn_off();
    }
  });

  lifecycle.onReady(() => {
    tvMode.getEntity().onUpdate(async (newState, oldState) => {
      const toggler = scene.toggle({
        transition: 3,
        scene: "scene.tv_mode",
        snapshot: [
          "light.living_room_floor_lamp_bottom",
          "cover.living_room_blinds",
          "light.living_room_floor_lamp_middle",
          "light.living_room_floor_lamp_top",
          "light.kitchen_fridge",
          "light.kitchen_oven",
          "light.kitchen_sink",
          "light.kitchen_washing_machine",
          "light.living_room_tv_wall",
          "light.living_room_bookcase",
          "light.living_room_back_wall_left",
          "light.living_room_back_wall_middle",
          "light.living_room_back_wall_right",
          "switch.adaptive_lighting_living_room",
          "switch.autoplay_music",
          "media_player.flat",
        ],
      });
      if (newState.state === "on" && oldState.state !== "on") {
        await hass.call.media_player.media_pause({
          entity_id: "media_player.living_room",
        });
        await toggler.on();
      } else if (newState.state === "off" && oldState.state !== "off") {
        await toggler.off();
      }
    });
  });

  const isOn = () => {
    const tvModeState = Boolean(tvMode.is_on);
    logger.info(`Checking tv mode is on: ${tvModeState}`);
    return tvModeState;
  };

  return { tvModeSwitch: tvMode, isOn };
}
