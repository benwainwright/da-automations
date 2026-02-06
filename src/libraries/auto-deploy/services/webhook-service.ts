import { TServiceParams } from "@digital-alchemy/core";

interface WebhookTriggerEvent {
  id: number;
  type: "event";
  event: {
    context: null;
    variables: {
      trigger: {
        alias: null;
        description: "webhook";
        id: string;
        idx: string;
        json?: Record<string, unknown>;
        platform: "webhook";
        webhook_id: "my-webhook";
      };
    };
  };
}

export function WebhookService({ hass, logger }: TServiceParams) {
  interface WebhookConfig {
    allowedMethods: ("POST" | "PUT")[];
    localOnly: boolean;
    webhookId: string;
    callback: (data: Record<string, unknown>) => Promise<void> | void;
  }

  const register = async (config: WebhookConfig) => {
    const data: { type: string; trigger: Record<string, unknown>; id?: number } = {
      type: "subscribe_trigger",
      trigger: {
        trigger: "webhook",
        allowed_methods: config.allowedMethods,
        local_only: config.localOnly,
        webhook_id: config.webhookId,
      },
    };
    await hass.socket.sendMessage(data);

    const hasId = (thing: unknown): thing is { id: number } => {
      return Boolean(
        thing && typeof thing === "object" && "id" in thing && typeof thing.id === "number",
      );
    };

    let registered = false;

    hass.socket.registerMessageHandler<{ id: number; type: "result" }>("result", async (result) => {
      if (result.id === data.id && !registered) {
        logger.info(`Websocket registered at /api/websocket/${config.webhookId}`);
        hass.socket.registerMessageHandler<WebhookTriggerEvent>("event", async (data) => {
          if (hasId(data) && data.id === result.id) {
            const { json } = data.event.variables.trigger;
            if (!json) {
              logger.info(`Webhook payload did not contain valid JSON`);
            } else {
              await config.callback(json);
            }
          }
        });
        registered = true;
      }
    });
  };

  return { webhook: register };
}
