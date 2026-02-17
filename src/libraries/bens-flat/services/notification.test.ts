import { beforeEach, expect, mock, test } from "bun:test";
import { NotificationService } from "./notification.ts";

beforeEach(() => {
  mock.clearAllMocks();
});

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
