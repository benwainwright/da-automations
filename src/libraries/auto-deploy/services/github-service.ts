import { TServiceParams } from "@digital-alchemy/core";
import { Octokit } from "octokit";
import { v7 } from "uuid";

export function GithubService({ auto_deploy, config, logger }: TServiceParams) {
  interface MonitorRepoConfig {
    repo: string;
    owner: string;
    callback: (data: Record<string, unknown>) => void | Promise<void>;
  }

  const monitorRepo = async ({ repo, owner, callback }: MonitorRepoConfig) => {
    const webhookId = v7();

    await auto_deploy.webhook.webhook({
      allowedMethods: ["POST"],
      localOnly: false,
      webhookId,
      callback,
    });

    const github = new Octokit({
      auth: config.auto_deploy.GITHUB_PAT,
    });

    const instance = config.auto_deploy.EXTERNAL_URL;

    const url = `${instance}/api/webhook/${webhookId}`;

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
