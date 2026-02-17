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

      let existingHookId = await getHookId(webhookId);
      if (existingHookId) {
        try {
          const existing = await github.rest.repos.getWebhook({
            hook_id: existingHookId,
            owner,
            repo,
          });
          if (existing.data.config.url !== url) {
            existingHookId = undefined;
          }
        } catch {
          existingHookId = undefined;
        }
      }

      if (!existingHookId) {
        const existingByUrl = await findExistingWebhookByUrl(github, owner, repo, url);
        existingHookId = existingByUrl?.id;
      }

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
        await writeId(webhookId, existingHookId);
        logger.info(`Repo ${owner}/${repo} webhook updated for ${url}`);
        return;
      }

      const created = await github.rest.repos.createWebhook({
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

      await writeId(webhookId, created.data.id);
      logger.info(`Repo ${owner}/${repo} webhook created for ${url}`);
    } catch (error) {
      logger.error(`Failed to register webhook`, error);
    }
  };

  return { monitorRepo };
}
