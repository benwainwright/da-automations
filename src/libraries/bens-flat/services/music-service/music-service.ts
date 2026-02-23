import { TServiceParams } from "@digital-alchemy/core";
import { MusicPlayer } from "./music-player.ts";

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
  const { tvMode, motion, mediaPlayer, sleepMode } = bens_flat;

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
    controller: mediaPlayer,
    mediaPlayer: "media_player.whole_flat",
    playerOnSwitch: "switch.autoplay_music",
    blockIfOn: ["switch.sleep_mode", "switch.tv_mode"],
    pauseAutoplayFor: [5, "minute"],
    logger,
  });

  motion.anywhere(() => player.onMotionInFlat());

  lifecycle.onReady(() => {
    tvMode.tvModeSwitch.onUpdate(async (newState, oldState) => {
      if (!newState) return;
      if (newState.state === "on" && oldState.state === "off") {
        await player.pause();
      }
    });

    sleepMode.sleepModeSwitch.onUpdate(async (newState, oldState) => {
      if (!newState) return;
      if (newState.state === "on" && oldState.state === "off") {
        await player.pause();
      }
    });
  });
}
