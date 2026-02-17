import { TServiceParams } from "@digital-alchemy/core";

interface SocketResultMessage {
  id: number;
  type: "result";
}

interface SocketTriggerEventMessage {
  id: number;
  type: "event";
  event: {
    variables: {
      trigger: {
        json?: Record<string, unknown>;
      };
    };
  };
}

interface SocketTriggerConfig {
  id: string;
  trigger: Record<string, unknown>;
  callback: (data: Record<string, unknown>) => Promise<void> | void;
}

export function SocketTriggerService({ hass, logger, auto_deploy }: TServiceParams) {
  const allTriggers = new Map<string, SocketTriggerConfig>();
  const pendingByMessageId = new Map<number, string>();
  const activeByMessageId = new Map<number, string>();
  let handlersAttached = false;

  const attachSocketHandlers = () => {
    if (handlersAttached) return;
    handlersAttached = true;

    hass.socket.registerMessageHandler<SocketResultMessage>("result", async (result) => {
      const triggerId = pendingByMessageId.get(result.id);
      if (!triggerId) return;
      pendingByMessageId.delete(result.id);
      activeByMessageId.set(result.id, triggerId);
      logger.info(`Socket trigger registered: ${triggerId}`);
      void auto_deploy?.lifecycle?.emit({
        type: "socket.trigger.registered",
        triggerId,
      });
    });

    hass.socket.registerMessageHandler<SocketTriggerEventMessage>("event", async (data) => {
      const triggerId = activeByMessageId.get(data.id);
      if (!triggerId) return;
      const config = allTriggers.get(triggerId);
      if (!config) return;
      const { json } = data.event.variables.trigger;
      if (!json) {
        logger.info(`Socket trigger payload was not valid JSON: ${triggerId}`);
        return;
      }
      void auto_deploy?.lifecycle?.emit({
        type: "socket.trigger.invoked",
        triggerId,
      });
      await config.callback(json);
    });
  };

  const subscribe = async (config: SocketTriggerConfig) => {
    const data: { type: string; trigger: Record<string, unknown>; id?: number } = {
      type: "subscribe_trigger",
      trigger: config.trigger,
    };

    await hass.socket.sendMessage(data, false);
    if (!data.id) {
      logger.error(`Failed to subscribe trigger: ${config.id} (missing socket message id)`);
      void auto_deploy?.lifecycle?.emit({
        type: "socket.trigger.error",
        triggerId: config.id,
        reason: "missing_socket_message_id",
      });
      return;
    }
    pendingByMessageId.set(data.id, config.id);
  };

  hass.socket.onConnect(async () => {
    activeByMessageId.clear();
    pendingByMessageId.clear();
    for (const config of allTriggers.values()) {
      await subscribe(config);
    }
  });

  const register = async (config: SocketTriggerConfig) => {
    attachSocketHandlers();
    allTriggers.set(config.id, config);
    await subscribe(config);
  };

  return { register };
}
