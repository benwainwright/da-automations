import { TServiceParams } from "@digital-alchemy/core";
import { Octokit } from "octokit";

import type { PushEvent } from "@octokit/webhooks-types";
import { readFile, writeFile } from "fs/promises";

export function GithubService({ auto_deploy, config, logger }: TServiceParams) {
  interface MonitorRepoConfig {
    repo: string;
    owner: string;
    callback: (data: PushEvent) => void | Promise<void>;
  }

  const getHooksFile = async () => {
    try {
      return JSON.parse(await readFile("hooks.json", "utf-8"));
    } catch {
      return {};
    }
  };

  const getHookId = async (webhookId: string): Promise<number | undefined> => {
    return (await getHooksFile())[webhookId];
  };

  const writeId = async (webhookId: string, githubWebhookId: number) => {
    const data = await getHooksFile();
    await writeFile("hooks.json", JSON.stringify({ ...data, [webhookId]: githubWebhookId }));
  };

  const deleteHookIfItExists = async (webhookId: string, owner: string, repo: string) => {
    const github = new Octokit({
      auth: config.auto_deploy.GITHUB_PAT,
    });
    const id = await getHookId(webhookId);
    if (id) {
      try {
        logger.info(`Checking for existing webhook`);
        const getResponse = await github.rest.repos.getWebhook({
          repo,
          owner,
          hook_id: id,
        });

        if (getResponse.data) {
          logger.info(`Found, deleting...`);
          await github.rest.repos.deleteWebhook({
            repo,
            owner,
            hook_id: id,
          });
        }
      } catch {
        // NOOP - doesn't matter if the webhook has allready been deleted
      }
    }
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

      await deleteHookIfItExists(webhookId, owner, repo);

      const github = new Octokit({
        auth: config.auto_deploy.GITHUB_PAT,
      });

      const response = await github.rest.repos.createWebhook({
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

      await writeId(webhookId, response.data.id);
      logger.info(`Repo ${owner}/${repo} webhook created for ${url}`);
    } catch (error) {
      logger.error(`Failed to register webhook`, error);
    }
  };

  return { monitorRepo };
}
