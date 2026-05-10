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

type GroupMembersAttributes = {
  attributes: {
    group_members: string;
  };
};

export function MediaPlayerService({ hass, logger, scheduler }: TServiceParams) {
  const play = async ({ player: playerId, id, type, volume, announce }: PlayConfig) => {
    logger.info(`Executing play: player=${playerId}, id=${id} type=${type} (volume=${volume})`);
    const playerIds = Array.isArray(playerId) ? playerId : [playerId];

    const [lead, ...rest] = playerIds;

    const leadEntity = hass.refBy.id(lead);

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

  interface ExposePlayingDataConfig {
    entity: PICK_ENTITY<"media_player">;
    topicPrefix: string;
  }

  const exposePlayingDataOnMqtt = ({ topicPrefix, entity }: ExposePlayingDataConfig) => {
    const player = hass.refBy.id(entity);
    const prefix = `${topicPrefix}/${entity}`;
    player.onUpdate(async (newState, oldState) => {
      await hass.call.mqtt.publish({
        topic: `${prefix}/status`,
        payload: newState.state,
        retain: true,
      });

      const newStateAs = newState as typeof newState & {
        attributes: { media_title?: string; media_artist?: string; entity_picture?: string };
      };
      const oldStateAs = oldState as typeof oldState & {
        attributes: { media_title?: string; media_artist?: string; entity_picture?: string };
      };

      if (newState.state === "playing") {
        if (
          newStateAs.attributes.media_title &&
          newStateAs.attributes.media_title !== oldStateAs.attributes.media_title
        ) {
          await hass.call.mqtt.publish({
            topic: `${prefix}/title`,
            payload: newStateAs.attributes.media_title,
            retain: true,
          });
        }

        if (newStateAs.attributes.media_title !== oldStateAs.attributes.media_title) {
          await hass.call.select.select_option({
            entity_id: "select.led_matrix_page",
            option: "media",
          });
          scheduler.setTimeout(async () => {
            await hass.call.select.select_option({
              entity_id: "select.led_matrix_page",
              option: "clock",
            });
          }, "5s");
        }

        if (
          newStateAs.attributes.media_artist &&
          newStateAs.attributes.media_artist !== oldStateAs.attributes.media_artist
        ) {
          await hass.call.mqtt.publish({
            topic: `${prefix}/artist`,
            payload: newStateAs.attributes.media_artist,
            retain: true,
          });
        }

        if (
          newStateAs.attributes.entity_picture &&
          newStateAs.attributes.entity_picture !== oldStateAs.attributes.entity_picture
        ) {
          await hass.call.mqtt.publish({
            topic: `${prefix}/artwork`,
            payload: newStateAs.attributes.entity_picture,
            retain: true,
          });
        }
      }
    });
  };

  return { play, playLocalMp3, exposePlayingDataOnMqtt };
}
