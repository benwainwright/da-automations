import { TServiceParams } from "@digital-alchemy/core";
import { mdi } from "../icons.ts";

export function TVModeService({
  hass,
  synapse,
  context,
  logger,
  lifecycle,
  bens_flat: { scene, blinds, entityIds },
  automation,
}: TServiceParams) {
  const tvMode = synapse.switch({
    name: "TV Mode",
    context,
    unique_id: "tv_mode_switch",
    suggested_object_id: "tv_mode",
    icon: mdi.television,
  });

  const xboxInGame = hass.refBy.id(entityIds.binarySensor.xbox);
  const appleTv = hass.refBy.id(entityIds.mediaPlayers.appleTv);
  const ps5NowPlaying = hass.refBy.id(entityIds.sensor.playingPs5);

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

    const isAirplay = attributes.app_id === "com.apple.TVAirPlay";
    const isYoutube = attributes.app_id === "com.google.ios.youtube";
    const isSpotify = attributes.app_id === "com.spotify.client";

    if (appleTv.state === "playing" && !isYoutube && !isSpotify && !isAirplay) {
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
    });

    tvMode.onUpdate(async (newState, oldState) => {
      if (!newState || !oldState) return;
      if (newState.state === "on" && oldState.state === "off") {
        logger.info(`TV mode as turned on, triggering actions`);
        await Promise.allSettled([
          hass.call.media_player.media_pause({
            entity_id: entityIds.mediaPlayers.livingRoom,
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
