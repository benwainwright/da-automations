import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

export interface PlayConfig {
  type: string;
  id: string;
  player: PICK_ENTITY<"media_player">;
  enqueue?: string;
  volume?: number;
  announce?: boolean;
}

export function MediaPlayerService({ hass }: TServiceParams) {
  const play = async ({ player: playerId, id, type, volume }: PlayConfig) => {
    const player = hass.refBy.id(playerId);

    if (volume) {
      await player.volume_set({ volume_level: volume });
    }

    const config = {
      media_content_id: id,
      media_content_type: type,
      // enqueue,
    } as unknown as Parameters<typeof player.play_media>[0];

    await player.play_media(config);
  };

  return { play };
}
