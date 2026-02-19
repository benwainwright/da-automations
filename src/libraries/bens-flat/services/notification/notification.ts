import { TServiceParams } from "@digital-alchemy/core";

export interface NotifyConfig {
  title: string;
  message: string;
}

export function NotificationService({ hass, bens_flat: { lights }, logger }: TServiceParams) {
  const tv = hass.refBy.id("media_player.tv");

  const speak = async (message: string) => {
    logger.info(`Speaking: ${message}`);
    try {
      await hass.call.openai_tts.say({
        message,
        tts_entity: "tts.openai_tts_gpt_40",
        volume: 0.5,
        entity_id: "media_player.whole_flat",
      });
    } catch {
      await hass.call.tts.speak({
        message,
        media_player_entity_id: "media_player.whole_flat",
        cache: true,
        entity_id: "tts.home_assistant_cloud",
      });
    }
  };

  const notify = async ({ message, title }: NotifyConfig) => {
    if (tv.state === "on") {
      await Promise.all([
        hass.call.notify.tv({
          message,
          title,
        }),
        hass.call.notify.mobile_app_bens_phone.call({ message, title }),
      ]);
    }
  };

  const notifyCritical = async ({ message, title }: NotifyConfig) => {
    if (tv.state === "on") {
      await Promise.all([
        lights.flash(),
        hass.call.notify.tv({
          message,
          title,
          data: {
            push: {
              interruption_level: "critical",
            },
          },
        }),
        speak(message),
      ]);
    }
  };

  const hasPersistentNotification = (notificationId: string) => {
    const entityId = `persistent_notification.${notificationId}`;
    return Boolean(hass.entity.getCurrentState(entityId as never));
  };

  const replacePersistentNotification = async ({
    notificationId,
    title,
    message,
  }: NotifyConfig & { notificationId: string }) => {
    try {
      await hass.call.persistent_notification.dismiss({
        notification_id: notificationId,
      });
    } catch (error) {
      logger.debug(
        { error, notificationId },
        `Persistent notification did not exist before replace; continuing with create`,
      );
    }

    await hass.call.persistent_notification.create({
      notification_id: notificationId,
      title,
      message,
    });
  };

  const replacePersistentNotificationIfExists = async ({
    notificationId,
    title,
    message,
  }: NotifyConfig & { notificationId: string }) => {
    if (!hasPersistentNotification(notificationId)) {
      return;
    }
    await replacePersistentNotification({ notificationId, title, message });
  };

  return {
    hasPersistentNotification,
    replacePersistentNotification,
    replacePersistentNotificationIfExists,
    notify,
    notifyCritical,
    speak,
  };
}
