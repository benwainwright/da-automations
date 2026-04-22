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

export function MediaPlayerService({ hass, logger, scheduler }: TServiceParams) {
  const play = async ({ player: playerId, id, type, volume, announce }: PlayConfig) => {
    logger.info(`Executing play: player=${playerId}, id=${id} type=${type} (volume=${volume})`);
    const playerIds = Array.isArray(playerId) ? playerId : [playerId];

    const [lead, ...rest] = playerIds;

    const leadEntity = hass.refBy.id(lead);

    type GroupMembersAttributes = {
      attributes: { group_members: string };
    };

    const withMembers = leadEntity as typeof leadEntity & GroupMembersAttributes;

    if (Array.isArray(playerId) && playerId.length > 1) {
      await hass.call.media_player.join({
        entity_id: lead,
        group_members: rest,
      });

      const members = withMembers.attributes.group_members;
      if (!playerIds.every((theId) => members.includes(theId))) {
        await new Promise<void>((accept, reject) => {
          const listener = leadEntity.onUpdate((newState) => {
            const theState = newState as typeof newState & GroupMembersAttributes;
            const theMembers = theState.attributes.group_members;
            if (playerIds.every((theId) => theMembers.includes(theId))) {
              listener.remove();
              accept();
              timeout.remove();
            }
          });

          const timeout = scheduler.setTimeout(() => {
            reject(new Error("Join action timed out"));
            listener.remove();
          }, "15s");
        });
      }
    }

    const config = {
      media_content_id: id,
      media_content_type: type,
      // enqueue,
      announce,
      volume,
    } as unknown as Parameters<typeof leadEntity.play_media>[0];

    logger.info(`config: ${JSON.stringify(config, null, 2)}`);

    await leadEntity.play_media(config);
  };

  const playLocalMp3 = async ({
    file,
    player,
  }: {
    player: PICK_ENTITY<"media_player"> | PICK_ENTITY<"media_player">[];
    file: string;
  }) => {
    await play({
      id: `media-source://media_source/local/${file}`,
      player,
      type: "audio/mpeg",
      announce: true,
    });
  };

  return { play, playLocalMp3 };
}
