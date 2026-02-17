import { beforeEach, expect, mock, test } from "bun:test";
import { NagService } from "./nag-service.ts";

beforeEach(() => {
  mock.clearAllMocks();
});

test("runs nag checks on interval and only notifies for truthy triggers", async () => {
  let intervalCallback: (() => Promise<void>) | undefined;
  const notifyCritical = mock(async () => {});

  const service = NagService({
    bens_flat: {
      notify: {
        notifyCritical,
      },
    },
    scheduler: {
      setInterval: (callback: () => Promise<void>, _offset: string) => {
        intervalCallback = callback;
        return { remove: () => {} };
      },
    },
  } as any);

  service.add({
    trigger: async () => true,
    notification: {
      title: "A",
      message: "B",
    },
  });

  service.add({
    trigger: async () => false,
    notification: {
      title: "C",
      message: "D",
    },
  });

  await intervalCallback?.();

  expect(notifyCritical).toHaveBeenCalledTimes(1);
  expect(notifyCritical).toHaveBeenCalledWith({
    title: "A",
    message: "B",
  });
});
