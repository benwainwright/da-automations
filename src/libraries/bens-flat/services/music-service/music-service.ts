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
  const { tvMode, motion } = bens_flat;

  synapse.switch({
    name: "Autoplay Music",
    icon: "mdi:music",
    unique_id: "autoplay_music_switch",
    suggested_object_id: "autoplay_music",
    context,
  });

  const player = new MusicPlayer({
    hass,
    scheduler,
    mediaPlayer: "media_player.whole_flat",
    playerOnSwitch: "switch.autoplay_music",
    blockIfOn: ["switch.sleep_mode", "switch.tv_mode"],
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
