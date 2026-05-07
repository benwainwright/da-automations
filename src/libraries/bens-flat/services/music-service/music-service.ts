import { TServiceParams } from "@digital-alchemy/core";
import { MusicPlayer } from "./music-player.ts";
import { mdi } from "../icons.ts";

/**
 * Automatically plays ambient music in the flat if there is movement and there
 * isn't already anything playing
 */
export function MusicService({
  hass,
  bens_flat,
  scheduler,
  synapse,
  context,
  logger,
  lifecycle,
}: TServiceParams) {
  const { tvMode, motion, mediaPlayer, sleepMode, entityIds } = bens_flat;

  const musicPlayerSwitch = synapse.switch({
    name: "Music",
    icon: mdi.music,
    unique_id: "autoplay_music_switch",
    suggested_object_id: "autoplay_music",
    context,
  });

  mediaPlayer.exposePlayingDataOnMqtt({
    entity: "media_player.living_room",
    /* cspell:disable-next-line */
    topicPrefix: "homeassistant/media_players",
  });

  lifecycle.onReady(() => {
    const player = new MusicPlayer({
      hass,
      scheduler,
      controller: mediaPlayer,
      mediaPlayer: entityIds.mediaPlayers.wholeFlat,
      playerOnSwitch: musicPlayerSwitch.entity_id,
      blockIfOn: [tvMode.tvModeSwitch.entity_id, sleepMode.sleepModeSwitch.entity_id],
      pauseAutoplayFor: [5, "minute"],
      logger,
    });

    motion.anywhere(() => player.onMotionInFlat());
    musicPlayerSwitch.onTurnOff(async () => {
      await player.pause();
    });

    tvMode.tvModeSwitch.onUpdate(async (newState, oldState) => {
      if (!newState || !oldState) return;
      if (newState.state === "on" && oldState.state === "off") {
        await player.pause();
      }
    });

    sleepMode.sleepModeSwitch.onUpdate(async (newState, oldState) => {
      if (!newState || !oldState) return;
      if (newState.state === "on" && oldState.state === "off") {
        await player.pause();
      }
    });
  });

  const pauseAll = async () => {
    await hass.call.media_player.media_pause({
      entity_id: "media_player.whole_flat",
    });
  };

  return { autoplaySwitch: musicPlayerSwitch, pauseAll };
}
