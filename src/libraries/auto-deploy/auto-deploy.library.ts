import { CreateLibrary } from "@digital-alchemy/core";
import { WebhookService } from "./services/webhook-service.ts";
import { MonitorService } from "./services/monitor-service.ts";
import { GithubService } from "./services/github-service.ts";
import { DeployService } from "./services/deploy-service.ts";
import { SocketTriggerService } from "./services/socket-trigger-service.ts";
import { LifecycleEventsService } from "./services/lifecycle-events-service.ts";

export const LIB_AUTO_DEPLOY = CreateLibrary({
  depends: [],
  name: "auto_deploy",
  priorityInit: ["lifecycle", "deploy", "github", "socketTrigger", "webhook"],
  configuration: {
    EXTERNAL_URL: {
      type: "string",
      required: true,
      description: "The external URL of your Home Assistant instance",
    },
    GITHUB_REPO: {
      type: "string",
      required: true,
      description: "The github repository name to deploy from",
    },
    GITHUB_REPO_OWNER: {
      type: "string",
      required: true,
      description: "The github repository owner",
    },
    GITHUB_PAT: {
      type: "string",
      required: true,
      description: "A personal access token that can be used to create a repository webhook",
    },
  },
  services: {
    lifecycle: LifecycleEventsService,
    socketTrigger: SocketTriggerService,
    webhook: WebhookService,
    monitor: MonitorService,
    github: GithubService,
    deploy: DeployService,
  },
});

declare module "@digital-alchemy/core" {
  export interface LoadedModules {
    auto_deploy: typeof LIB_AUTO_DEPLOY;
  }
}
