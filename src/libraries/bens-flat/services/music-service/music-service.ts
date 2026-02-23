import { TServiceParams } from "@digital-alchemy/core";
import { IMusicPlayer, MusicPlayer } from "./music-player.ts";

export function MusicService({
  hass,
  bens_flat,
  scheduler,
  synapse,
  context,
  logger,
  lifecycle,
}: TServiceParams) {
  const { tvMode, sleepMode, motion } = bens_flat;

  const autoplaySwitch = synapse.switch({
    name: "Autoplay Music",
    icon: "mdi:music",
    unique_id: "autoplay_music_switch",
    suggested_object_id: "autoplay_music",
    context,
  });

  const switchEntity = autoplaySwitch.entity_id;

  const player = new MusicPlayer({
    hass,
    scheduler,
    mediaPlayer: "media_player.whole_flat",
    playerOnSwitch: switchEntity,
    blockIfOn: [sleepMode.sleepModeSwitch.entity_id, tvMode.tvModeSwitch.entity_id],
    pauseAutoplayFor: [15, "minute"],
    logger,
  });

  motion.anywhere(() => player.onMotionInFlat());

  const exportPlayer: IMusicPlayer = player;

  lifecycle.onReady(() => {
    tvMode.tvModeSwitch.onUpdate(async (newState, oldState) => {
      if (!newState) return;
      if (newState.state === "on" && oldState.state === "off") {
        await player.pause();
      }
    });
  });

  return { player: exportPlayer };
}
