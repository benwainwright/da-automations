import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

export interface NotifyConfig {
  title: string;
  message: string;
}

export function NotificationService({
  hass,
  bens_flat: { lights, mediaPlayer, entityIds },
  logger,
}: TServiceParams) {
  const TTS_START_TIMEOUT_MS = 10_000;
  const TTS_PLAYBACK_TIMEOUT_MS = 120_000;

  // Resolve TV entity lazily so tests can omit entityIds
  const getTv = () =>
    entityIds?.mediaPlayers?.tv
      ? hass.refBy.id(entityIds.mediaPlayers.tv)
      : ({ state: "off" } as any);

  interface ITtsSayConfig {
    message: string;
    announce: boolean;
    source: PICK_ENTITY<"tts">;
    player: PICK_ENTITY<"media_player">;
    volume?: number;
  }

  const waitForStateChange = async (
    player: ReturnType<typeof hass.refBy.id>,
    expectedState: string,
    timeoutMs: number,
  ) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let didReachState = false;
    await Promise.race([
      player.waitForState(expectedState).then(() => {
        didReachState = true;
      }),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, timeoutMs);
      }),
    ]);

    if (timeout) {
      clearTimeout(timeout);
    }
    return didReachState;
  };

  const waitForPlaybackEnd = async (player: ReturnType<typeof hass.refBy.id>) => {
    let listener: { remove: () => void } | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    await new Promise<void>((resolve) => {
      const finish = () => {
        if (timeout) {
          clearTimeout(timeout);
        }
        listener?.remove();
        resolve();
      };

      timeout = setTimeout(() => {
        logger.warn(`Timed out waiting for TTS playback to finish`);
        finish();
      }, TTS_PLAYBACK_TIMEOUT_MS);

      listener = player.onUpdate((newState) => {
        if (newState.state !== "playing") {
          finish();
        }
      });
    });
  };

  const waitForPlayback = async (player: ReturnType<typeof hass.refBy.id>) => {
    if (player.state !== "playing") {
      const didStart = await waitForStateChange(player, "playing", TTS_START_TIMEOUT_MS);
      if (!didStart && player.state !== "playing") {
        logger.warn(`Timed out waiting for TTS playback to start`);
        return;
      }
    }
    await waitForPlaybackEnd(player);
  };

  const ttsSay = async (config: ITtsSayConfig) => {
    const player = hass.refBy.id(config.player);
    const originalVolume = player.attributes?.["volume_level"];

    try {
      if (config.announce) {
        await hass.call.tts.speak({
          entity_id: config.source,
          media_player_entity_id: config.player,
          message: config.message,
        });
        return;
      }

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
        announce: false,
      });

      await waitForPlayback(player);
    } finally {
      if (config.volume && originalVolume !== undefined) {
        await hass.call.media_player.volume_set({
          volume_level: originalVolume,
          entity_id: config.player,
        });
      }
    }
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
    logger.info(`Speaking: ${message} (announce: ${announce})`);
    try {
      await ttsSay({
        volume,
        source: entityIds?.tts?.openAiGpt4 as any,
        message,
        announce,
        player: entityIds?.mediaPlayers?.wholeFlat as any,
      });
    } catch {
      await ttsSay({
        source: entityIds?.tts?.openAiGpt4 as any,
        volume,
        message,
        announce,
        player: entityIds?.mediaPlayers?.wholeFlat as any,
      });
    }
  };

  const notify = async ({ message, title }: NotifyConfig) => {
    const tv = getTv();
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
    const tv = getTv();
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
