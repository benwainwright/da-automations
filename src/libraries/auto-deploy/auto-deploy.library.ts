import { CreateLibrary } from "@digital-alchemy/core";
import { WebhookService } from "./services/webhook-service.ts";
import { MonitorService } from "./services/monitor-service.ts";
import { GithubService } from "./services/github-service.ts";
import { DeployService } from "./services/deploy-service.ts";

export const LIB_AUTO_DEPLOY = CreateLibrary({
  depends: [],
  name: "auto_deploy",
  priorityInit: ["deploy", "github", "webhook"],
  configuration: {
    EXTERNAL_URL: {
      type: "string",
      description: "The external URL of your Home Assistant instance",
    },
    GITHUB_REPO: {
      type: "string",
      description: "The github repository name to deploy from",
    },
    GITHUB_REPO_OWNER: {
      type: "string",
      description: "The github repository owner",
    },
    GITHUB_PAT: {
      type: "string",
      description: "A personal access token that can be used to create a repository webhook",
    },
    ADDON_SLUG: {
      type: "string",
      description: "The slug of the addon you need to restart after deploy",
    },
  },
  services: {
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
