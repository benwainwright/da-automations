import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

export interface PlayConfig {
  type: string;
  id: string;
  player: PICK_ENTITY<"media_player">[] | PICK_ENTITY<"media_player">;
  enqueue?: string;
  volume?: number;
  announce?: boolean;
}

export function MediaPlayerService({ hass, logger }: TServiceParams) {
  const play = async ({ player: playerId, id, type, volume }: PlayConfig) => {
    logger.info(`Executing play: player=${playerId}, id=${id} type=${type} (volume=${volume})`);
    const playerIds = Array.isArray(playerId) ? playerId : [playerId];

    const [lead, ...rest] = playerIds;
    if (playerId.length > 1) {
      await hass.call.media_player.join({
        entity_id: lead,
        group_members: rest,
      });
    }

    const leadEntity = hass.refBy.id(lead);

    if (volume) {
      playerIds
        .map((id) => hass.refBy.id(id))
        .forEach(async (player) => {
          await player.volume_set({ volume_level: volume });
        });
    }

    const config = {
      media_content_id: id,
      media_content_type: type,
      // enqueue,
    } as unknown as Parameters<typeof leadEntity.play_media>[0];

    logger.info(`config: ${JSON.stringify(config, null, 2)}`);

    await leadEntity.play_media(config);
  };

  return { play };
}
