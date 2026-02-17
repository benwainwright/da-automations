import { expect, mock, test } from "bun:test";
import { WebhookService } from "../libraries/auto-deploy/services/webhook-service.ts";

test("translates webhook registration into a socket-trigger registration", async () => {
  const register = mock(async () => {});
  const callback = mock(() => {});

  const service = WebhookService({
    auto_deploy: {
      socketTrigger: { register },
    },
  } as any);

  await service.register({
    allowedMethods: ["POST"],
    localOnly: false,
    webhookId: "repo-hook",
    callback,
  });

  expect(register).toHaveBeenCalledTimes(1);
  expect(register).toHaveBeenCalledWith({
    callback,
    id: "repo-hook",
    trigger: {
      allowed_methods: ["POST"],
      local_only: false,
      trigger: "webhook",
      webhook_id: "repo-hook",
    },
  });
});
