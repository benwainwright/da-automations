import { beforeEach, expect, mock, test } from "bun:test";
import { NotificationService } from "./notification.ts";

beforeEach(() => {
  mock.clearAllMocks();
});

const waitWithTimeout = async (promise: Promise<void>) => {
  await Promise.race([
    promise,
    new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error("Timed out waiting for promise")), 50);
    }),
  ]);
};

test("replacePersistentNotification dismisses and recreates notification", async () => {
  const dismiss = mock(async () => {});
  const create = mock(async () => {});

  const service = NotificationService({
    bens_flat: { lights: { flash: mock(async () => {}) } },
    hass: {
      call: {
        media_player: { join: mock(async () => {}) },
        notify: { mobile_app_bens_phone: { call: mock(async () => {}) }, tv: mock(async () => {}) },
        persistent_notification: { create, dismiss },
        tts: { speak: mock(async () => {}) },
      },
      entity: {
        getCurrentState: (_id: string) => undefined,
      },
      refBy: {
        id: (_id: string) => ({ entity_id: _id, state: "off" }),
      },
    },
  } as any);

  await service.replacePersistentNotification({
    notificationId: "auto_deploy_status",
    title: "Auto Deploy",
    message: "Deploy triggered.",
  });

  expect(dismiss).toHaveBeenCalledWith({ notification_id: "auto_deploy_status" });
  expect(create).toHaveBeenCalledWith({
    notification_id: "auto_deploy_status",
    title: "Auto Deploy",
    message: "Deploy triggered.",
  });
});

test("replacePersistentNotificationIfExists only updates when notification exists", async () => {
  const dismiss = mock(async () => {});
  const create = mock(async () => {});
  const service = NotificationService({
    bens_flat: { lights: { flash: mock(async () => {}) } },
    hass: {
      call: {
        media_player: { join: mock(async () => {}) },
        notify: { mobile_app_bens_phone: { call: mock(async () => {}) }, tv: mock(async () => {}) },
        persistent_notification: { create, dismiss },
        tts: { speak: mock(async () => {}) },
      },
      entity: {
        getCurrentState: (_id: string) => ({ entity_id: _id }),
      },
      refBy: {
        id: (_id: string) => ({ entity_id: _id, state: "off" }),
      },
    },
  } as any);

  await service.replacePersistentNotificationIfExists({
    notificationId: "auto_deploy_status",
    title: "Auto Deploy",
    message: "Application restarted.",
  });

  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledTimes(1);
});

test("speak resolves after an announce TTS call", async () => {
  const speak = mock(async () => {});
  const play = mock(async () => {});
  const service = NotificationService({
    bens_flat: {
      entityIds: {
        mediaPlayers: { wholeFlat: "media_player.whole_flat" },
        tts: { openAiGpt4: "tts.openai_tts_gpt_40" },
      },
      lights: { flash: mock(async () => {}) },
      mediaPlayer: { play },
    },
    hass: {
      call: {
        media_player: { volume_set: mock(async () => {}) },
        notify: { mobile_app_bens_phone: { call: mock(async () => {}) }, tv: mock(async () => {}) },
        persistent_notification: { create: mock(async () => {}), dismiss: mock(async () => {}) },
        tts: { speak },
      },
      refBy: {
        id: (_id: string) => ({ attributes: {}, entity_id: _id, state: "off" }),
      },
    },
    logger: { info: mock(() => {}), warn: mock(() => {}) },
  } as any);

  await waitWithTimeout(service.speak({ message: "hello", announce: true }));

  expect(play).toHaveBeenCalledWith({
    id: "media-source://tts/tts.openai_tts_gpt_40?message=hello",
    type: "provider",
    player: "media_player.whole_flat",
    announce: true,
  });
  expect(speak).not.toHaveBeenCalled();
});

test("speak resolves when non-announce playback stops", async () => {
  let onUpdate: ((newState: { state: string }) => void) | undefined;
  const remove = mock(() => {});
  const play = mock(async () => {});
  const service = NotificationService({
    bens_flat: {
      entityIds: {
        mediaPlayers: { wholeFlat: "media_player.whole_flat" },
        tts: { openAiGpt4: "tts.openai_tts_gpt_40" },
      },
      lights: { flash: mock(async () => {}) },
      mediaPlayer: { play },
    },
    hass: {
      call: {
        media_player: { volume_set: mock(async () => {}) },
        notify: { mobile_app_bens_phone: { call: mock(async () => {}) }, tv: mock(async () => {}) },
        persistent_notification: { create: mock(async () => {}), dismiss: mock(async () => {}) },
        tts: { speak: mock(async () => {}) },
      },
      refBy: {
        id: (_id: string) => ({
          attributes: { volume_level: 0.3 },
          entity_id: _id,
          onUpdate: (callback: (newState: { state: string }) => void) => {
            onUpdate = callback;
            return { remove };
          },
          state: "playing",
          waitForState: mock(async () => {}),
        }),
      },
    },
    logger: { info: mock(() => {}), warn: mock(() => {}) },
  } as any);

  const speaking = service.speak({ message: "hello" });
  await Promise.resolve();
  onUpdate?.({ state: "idle" });
  await waitWithTimeout(speaking);

  expect(play).toHaveBeenCalledWith({
    id: "media-source://tts/tts.openai_tts_gpt_40?message=hello",
    type: "provider",
    player: "media_player.whole_flat",
    announce: false,
  });
  expect(remove).toHaveBeenCalledTimes(1);
});

test("speak does not warn when non-announce playback does not report playing", async () => {
  const play = mock(async () => {});
  const warn = mock(() => {});
  const service = NotificationService({
    bens_flat: {
      entityIds: {
        mediaPlayers: { wholeFlat: "media_player.whole_flat" },
        tts: { openAiGpt4: "tts.openai_tts_gpt_40" },
      },
      lights: { flash: mock(async () => {}) },
      mediaPlayer: { play },
    },
    hass: {
      call: {
        media_player: { volume_set: mock(async () => {}) },
        notify: { mobile_app_bens_phone: { call: mock(async () => {}) }, tv: mock(async () => {}) },
        persistent_notification: { create: mock(async () => {}), dismiss: mock(async () => {}) },
        tts: { speak: mock(async () => {}) },
      },
      refBy: {
        id: (_id: string) => ({
          attributes: { volume_level: 0.3 },
          entity_id: _id,
          state: "idle",
        }),
      },
    },
    logger: { info: mock(() => {}), warn },
  } as any);

  await waitWithTimeout(service.speak({ message: "hello", announce: false }));

  expect(play).toHaveBeenCalledWith({
    id: "media-source://tts/tts.openai_tts_gpt_40?message=hello",
    type: "provider",
    player: "media_player.whole_flat",
    announce: false,
  });
  expect(warn).not.toHaveBeenCalled();
});
