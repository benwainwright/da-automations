import { expect, mock, test } from "bun:test";
import { CoreModule } from "./core.ts";

test("subscribes to auto-deploy lifecycle and updates persistent notifications", async () => {
  let onReady: (() => Promise<void>) | undefined;
  let lifecycleListener: ((event: { type: string }) => Promise<void>) | undefined;

  const replacePersistentNotificationIfExists = mock(async () => {});
  const replacePersistentNotification = mock(async () => {});

  CoreModule({
    auto_deploy: {
      lifecycle: {
        listen: (callback: (event: { type: string }) => Promise<void>) => {
          lifecycleListener = callback;
          return { remove: () => {} };
        },
      },
    },
    bens_flat: {
      blinds: { close: mock(async () => {}), openIfDefaultIsOpen: mock(async () => {}) },
      lights: {
        setupMotionTrigger: mock(() => {}),
        turnOffAll: mock(async () => {}),
      },
      notify: {
        replacePersistentNotification,
        replacePersistentNotificationIfExists,
      },
      presence: {
        flatIsOccupiedSwitch: {
          onUpdate: (_callback: unknown) => {},
        },
      },
      sleepMode: {
        sleepModeSwitch: {
          onUpdate: (_callback: unknown) => {},
        },
      },
      tvMode: {
        tvModeSwitch: {
          onUpdate: (_callback: unknown) => {},
        },
      },
    },
    lifecycle: {
      onReady: (callback: () => Promise<void>) => {
        onReady = callback;
      },
    },
    scheduler: {
      setTimeout: () => ({ remove: () => {} }),
    },
  } as any);

  await onReady?.();

  expect(replacePersistentNotificationIfExists).toHaveBeenCalledWith({
    notificationId: "auto_deploy_status",
    title: "Auto Deploy",
    message: "Automation application restarted after deploy.",
  });

  await lifecycleListener?.({ type: "deploy.started" });
  expect(replacePersistentNotification).toHaveBeenCalledWith({
    notificationId: "auto_deploy_status",
    title: "Auto Deploy",
    message: "Deploy triggered. Pulling and building latest automation code...",
  });

  await lifecycleListener?.({ type: "restart.requested" });
  expect(replacePersistentNotification).toHaveBeenCalledWith({
    notificationId: "auto_deploy_status",
    title: "Auto Deploy",
    message: "Deploy finished. Restarting automation application now...",
  });
});
