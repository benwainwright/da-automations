import { TServiceParams } from "@digital-alchemy/core";
import { Octokit } from "octokit";
import { v7 } from "uuid";

import type { PushEvent } from "@octokit/webhooks-types";

export function GithubService({ auto_deploy, config, logger }: TServiceParams) {
  interface MonitorRepoConfig {
    repo: string;
    owner: string;
    callback: (data: PushEvent) => void | Promise<void>;
  }

  const monitorRepo = async ({ repo, owner, callback }: MonitorRepoConfig) => {
    const webhookId = v7();

    await auto_deploy.webhook.webhook({
      allowedMethods: ["POST"],
      localOnly: false,
      webhookId,
      callback: async (data) => {
        await callback(data as unknown as PushEvent);
      },
    });

    const github = new Octokit({
      auth: config.auto_deploy.GITHUB_PAT,
    });

    const instance = config.auto_deploy.EXTERNAL_URL;

    const url = `${instance}/api/webhook/${webhookId}`;
    logger.info(`Creating repository webhook for ${url}`);

    await github.rest.repos.createWebhook({
      repo,
      owner,
      name: "web",
      config: {
        content_type: "json",
        url,
      },
      events: ["push"],
      active: true,
    });

    logger.info(`Github repo ${owner}/${repo} webhook created for ${url}`);
  };

  return { monitorRepo };
}
