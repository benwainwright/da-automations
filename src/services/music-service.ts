import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

interface LibraryItem {
  media_type: string;
  uri: string;
  name: string;
  image: string;
  favourite: boolean;
}

interface PlayConfig {
  type: string;
  id: string;
  player: PICK_ENTITY<"media_player">;
  volume?: number;
}

export function MusicService({ hass, bens_flat, synapse, context, logger }: TServiceParams) {
  const { tvMode, sleepMode, motion } = bens_flat;

  const autoplaySwitch = synapse.switch({
    name: "Autoplay Music",
    icon: "mdi:music",
    context,
  });

  const play = async ({ player: playerId, id, type, volume }: PlayConfig) => {
    const player = hass.refBy.id(playerId);

    if (volume) {
      await player.volume_set({ volume_level: volume });
    }

    const config = {
      media_content_id: id,
      media_content_type: type,
    } as unknown as Parameters<typeof player.play_media>[0];

    await player.play_media(config);
  };

  const playRandomFavouritePlaylist = async () => {
    const result = await hass.call.music_assistant.get_library<{ items: LibraryItem[] }>({
      favorite: true,
      media_type: "playlist",
      config_entry_id: "01KGQT8ZJWTVX9DXC1KEFG8FG8",
      order_by: "random_play_count",
    });
    const [first] = result.items;

    if (first) {
      await play({
        id: first.uri,
        type: first.media_type,
        player: "media_player.flat",
        volume: 0.2,
      });
    }
  };

  motion.anywhere(async () => {
    const wholeFlatPlayer = hass.refBy.id("media_player.flat");

    if (
      !tvMode.tvModeSwitch.is_on &&
      !sleepMode.sleepModeSwitch.is_on &&
      wholeFlatPlayer.state !== "playing" &&
      autoplaySwitch.is_on
    ) {
      logger.info(`Autoplay is on playing some background music`);
      await playRandomFavouritePlaylist();
    }
  });
}
