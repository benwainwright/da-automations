import { TServiceParams } from "@digital-alchemy/core";
import { mdi } from "../icons.ts";

export function TVModeService({
  hass,
  synapse,
  context,
  logger,
  lifecycle,
  bens_flat: { scene, blinds },
  automation,
}: TServiceParams) {
  const tvMode = synapse.switch({
    name: "TV Mode",
    context,
    unique_id: "tv_mode_switch",
    suggested_object_id: "tv_mode",
    icon: mdi.television,
  });

  const xboxInGame = hass.refBy.id("binary_sensor.xbox_network_in_game");
  const appleTv = hass.refBy.id("media_player.apple_tv");
  const ps5NowPlaying = hass.refBy.id("sensor.ps5_now_playing");

  const shouldBeOn = () => {
    if (xboxInGame.state === "on") {
      logger.info(`XBOX playing, turning TV mode on`);
      return true;
    }

    if (ps5NowPlaying.state === "playing") {
      logger.info(`PS5 playing, turning TV mode on`);
      return true;
    }

    const attributes = appleTv.attributes as typeof appleTv.attributes & {
      app_id: string;
    };

    const isYoutube = attributes.app_id === "com.google.ios.youtube";
    const isSpotify = attributes.app_id === "com.spotify.client";

    if (appleTv.state === "playing" && !isYoutube && !isSpotify) {
      logger.info(`Apple tv playing - turning TV mode on`);
      return true;
    }

    logger.info(`TV mode is off`);
    return false;
  };

  lifecycle.onReady(() => {
    automation.managed_switch({
      context,
      entity_id: tvMode.entity_id,
      shouldBeOn,
      onUpdate: [appleTv, ps5NowPlaying, xboxInGame],
    });

    const toggler = scene.toggle({
      transition: 3,
      scene: "scene.tv_mode",
      snapshot: [
        "light.living_room_floor_lamp_bottom",
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
        "switch.living_room_motion_sensor",
        "switch.autoplay_music",
      ],
    });

    tvMode.onUpdate(async (newState, oldState) => {
      if (!newState || !oldState) return;
      if (newState.state === "on" && oldState.state === "off") {
        logger.info(`TV mode as turned on, triggering actions`);
        await Promise.allSettled([
          hass.call.media_player.media_pause({
            entity_id: "media_player.living_room",
          }),
          toggler.on(),
          blinds.close(),
        ]);
      } else if (newState.state === "off" && oldState.state === "on") {
        logger.info(`Turning TV mode off`);
        await toggler.off();
      }
    });
  });

  lifecycle.onReady(() => {
    const tvModeEntity = tvMode.getEntity();

    tvModeEntity.onStateFor({
      state: "off",
      for: [5, "minute"],
      exec: async () => {
        await blinds.openIfDefaultIsOpen();
      },
    });
  });

  const isOn = () => {
    const tvModeState = Boolean(tvMode.is_on);
    logger.info(`Checking tv mode is on: ${tvModeState}`);
    return tvModeState;
  };

  return { tvModeSwitch: tvMode, isOn };
}
