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

  const manageTvMode = synapse.switch({
    name: "Manage TV Mode",
    context,
    unique_id: "manage_tv_mode",
    suggested_object_id: "manage_tv_mode",
    icon: mdi.television,
  });

  const xboxInGame = hass.refBy.id(entityIds.binarySensor.xbox);
  const appleTv = hass.refBy.id(entityIds.mediaPlayers.appleTv);
  const ps5NowPlaying = hass.refBy.id(entityIds.sensor.playingPs5);

  const normalize = (input: string): string => input.replace(/[^a-z0-9]/gi, "").toLowerCase();

  const tvModeSwitches = Object.fromEntries(
    appleTv.attributes.source_list.map((source) => {
      const id = `tv_mode_enabled_${normalize(source)}`;

      return [
        normalize(source),
        synapse.switch({
          name: `TV Mode enabled for ${source}`,
          context,
          unique_id: id,
          suggested_object_id: id,
        }),
      ];
    }),
  );

  const shouldBeOn = () => {
    if (!manageTvMode.is_on) {
      const entity = tvMode.getEntity();
      return entity.state === "on";
    }

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
      app_name: string;
    };

    const theSwitch = tvModeSwitches[normalize(attributes.app_name)];

    if ((appleTv.state === "playing" && !theSwitch) || theSwitch.is_on) {
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
