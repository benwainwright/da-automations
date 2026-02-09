import { TServiceParams } from "@digital-alchemy/core";

export interface NotifyConfig {
  title: string;
  message: string;
}

export function NotificationService({ hass }: TServiceParams) {
  const tv = hass.refBy.id("media_player.tv");

  const bedroomSonos = hass.refBy.id("media_player.bedroom_sonos");
  const livingRoomSonos = hass.refBy.id("media_player.living_room_sonos");

  const speak = async (message: string) => {
    await hass.call.media_player.join({
      entity_id: bedroomSonos.entity_id,
      group_members: [livingRoomSonos.entity_id],
    });

    await hass.call.tts.speak({
      message,
      media_player_entity_id: bedroomSonos.entity_id,
      cache: true,
      entity_id: "tts.home_assistant_cloud",
    });
  };

  const notify = async ({ message, title }: NotifyConfig) => {
    if (tv.state === "on") {
      hass.call.notify.tv({
        message,
        title,
      });

      await hass.call.notify.mobile_app_bens_phone.call({ message, title });
    }
  };

  const notifyCritical = async ({ message, title }: NotifyConfig) => {
    if (tv.state === "on") {
      hass.call.notify.tv({
        message,
        title,
        data: {
          push: {
            interruption_level: "critical",
          },
        },
      });
    }
    await speak(message);
  };

  return { notify, notifyCritical, speak };
}
