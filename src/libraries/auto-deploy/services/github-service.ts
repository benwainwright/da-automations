import { TServiceParams } from "@digital-alchemy/core";
import { Octokit } from "octokit";

import type { PushEvent } from "@octokit/webhooks-types";

export function GithubService({ auto_deploy, config, logger }: TServiceParams) {
  interface MonitorRepoConfig {
    repo: string;
    owner: string;
    callback: (data: PushEvent) => void | Promise<void>;
  }

  const findExistingWebhookByUrl = async (
    github: Octokit,
    owner: string,
    repo: string,
    url: string,
  ) => {
    const response = await github.rest.repos.listWebhooks({
      owner,
      per_page: 100,
      repo,
    });
    return response.data.find((hook) => hook.config.url === url);
  };

  const monitorRepo = async ({ repo, owner, callback }: MonitorRepoConfig) => {
    try {
      const webhookId = `github-repo-monitor-${owner}-${repo}`;

      await auto_deploy.webhook.register({
        allowedMethods: ["POST"],
        localOnly: false,
        webhookId,
        callback: async (data) => {
          await callback(data as unknown as PushEvent);
        },
      });

      const instance = config.auto_deploy.EXTERNAL_URL;

      const url = `${instance}/api/webhook/${webhookId}`;
      logger.info(`Creating repository webhook for ${url}`);

      const github = new Octokit({
        auth: config.auto_deploy.GITHUB_PAT,
      });

      const existingHookId = (await findExistingWebhookByUrl(github, owner, repo, url))?.id;

      if (existingHookId) {
        logger.info(`Existing webhook found on repository, updating ${existingHookId}`);
        await github.rest.repos.updateWebhook({
          active: true,
          config: {
            content_type: "json",
            url,
          },
          events: ["push"],
          hook_id: existingHookId,
          owner,
          repo,
        });
        logger.info(`Repo ${owner}/${repo} webhook updated for ${url}`);
        return;
      }

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
      logger.info(`Repo ${owner}/${repo} webhook created for ${url}`);
    } catch (error) {
      logger.error(`Failed to register webhook`, error);
    }
  };

  return { monitorRepo };
}
