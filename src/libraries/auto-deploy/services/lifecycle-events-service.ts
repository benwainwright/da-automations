import { TServiceParams } from "@digital-alchemy/core";

export type AutoDeployLifecycleEvent =
  | {
      type: "monitor.ready";
      owner: string;
      repo: string;
    }
  | {
      type: "push.received";
      ref: string;
    }
  | {
      type: "push.ignored";
      ref: string;
    }
  | {
      type: "deploy.started";
      runId: number;
    }
  | {
      type: "deploy.cancel.requested";
    }
  | {
      type: "deploy.cancelled";
    }
  | {
      type: "deploy.completed";
      runId: number;
    }
  | {
      type: "deploy.failed";
      error: string;
    }
  | {
      type: "restart.requested";
    }
  | {
      type: "github.webhook.sync.started";
      owner: string;
      repo: string;
      url: string;
      webhookId: string;
    }
  | {
      type: "github.webhook.updated";
      owner: string;
      repo: string;
      url: string;
      hookId: number;
    }
  | {
      type: "github.webhook.created";
      owner: string;
      repo: string;
      url: string;
    }
  | {
      type: "github.webhook.error";
      owner: string;
      repo: string;
      error: string;
    }
  | {
      type: "socket.trigger.registered";
      triggerId: string;
    }
  | {
      type: "socket.trigger.invoked";
      triggerId: string;
    }
  | {
      type: "socket.trigger.error";
      triggerId: string;
      reason: string;
    };

type LifecycleListener = (event: AutoDeployLifecycleEvent) => void | Promise<void>;

export function LifecycleEventsService({ logger }: TServiceParams) {
  const listeners = new Set<LifecycleListener>();

  const listen = (callback: LifecycleListener) => {
    listeners.add(callback);
    return {
      remove: () => {
        listeners.delete(callback);
      },
    };
  };

  const emit = async (event: AutoDeployLifecycleEvent) => {
    for (const listener of listeners) {
      try {
        await listener(event);
      } catch (error) {
        logger.error(`Auto-deploy lifecycle listener threw`, error);
      }
    }
  };

  return { emit, listen };
}
