import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

export interface NotifyConfig {
  title: string;
  message: string;
}

export function NotificationService({
  hass,
  bens_flat: { lights, mediaPlayer },
  logger,
}: TServiceParams) {
  const tv = hass.refBy.id("media_player.tv");

  interface ITtsSayConfig {
    message: string;
    announce: boolean;
    source: PICK_ENTITY<"tts">;
    player: PICK_ENTITY<"media_player">;
    volume?: number;
  }

  const ttsSay = async (config: ITtsSayConfig) => {
    return new Promise<void>(async (accept, reject) => {
      const player = hass.refBy.id(config.player);
      const originalVolume = player.attributes["volume_level"];
      try {
        if (config.volume) {
          await hass.call.media_player.volume_set({
            volume_level: config.volume,
            entity_id: config.player,
          });
        }
        await mediaPlayer.play({
          id: `media-source://tts/${config.source}?message=${encodeURIComponent(config.message)}`,
          type: "provider",
          player: config.player,
          announce: config.announce,
        });
        if (config.announce) {
          accept();
        } else {
          logger.info(`Waiting for playing`);
          await player.waitForState("playing");
          logger.info(`Playing found`);
          const listener = player.onUpdate((newState) => {
            logger.info(`Next state`);
            if (newState.state !== "playing") {
              logger.info(`State is not playing`);
              listener.remove();
              accept();
            }
          });
        }
      } catch (error) {
        reject(error);
      } finally {
        if (config.volume) {
          await hass.call.media_player.volume_set({
            volume_level: originalVolume,
            entity_id: config.player,
          });
        }
      }
    });
  };

  const speak = async ({
    message,
    announce = false,
    volume,
  }: {
    message: string;
    announce?: boolean;
    volume?: number;
  }) => {
    logger.info(`Speaking: ${message}`);
    try {
      await ttsSay({
        volume,
        source: "tts.openai_tts_gpt_40",
        message,
        announce,
        player: "media_player.whole_flat",
      });
    } catch {
      await ttsSay({
        source: "tts.home_assistant_cloud",
        volume,
        message,
        announce,
        player: "media_player.whole_flat",
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
        speak({ message }),
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
