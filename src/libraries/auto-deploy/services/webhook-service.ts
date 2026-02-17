import { TServiceParams } from "@digital-alchemy/core";

export function WebhookService({ auto_deploy }: TServiceParams) {
  interface WebhookConfig {
    allowedMethods: ("POST" | "PUT")[];
    localOnly: boolean;
    webhookId: string;
    callback: (data: Record<string, unknown>) => Promise<void> | void;
  }

  const register = async (config: WebhookConfig) => {
    await auto_deploy.socketTrigger.register({
      callback: config.callback,
      id: config.webhookId,
      trigger: {
        trigger: "webhook",
        allowed_methods: config.allowedMethods,
        local_only: config.localOnly,
        webhook_id: config.webhookId,
      },
    });
  };

  return { register };
}
