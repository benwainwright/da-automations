import { TServiceParams } from "@digital-alchemy/core";
import { PushEvent } from "@octokit/webhooks-types";

export function MonitorService({
  config,
  lifecycle,
  auto_deploy: { github, deploy },
  logger,
}: TServiceParams) {
  const onPush = async (data: PushEvent) => {
    logger.info(`Push event received`);
    if (data.ref === "refs/heads/main") {
      logger.info(`Someone pushed to main. Deploying the latest version`);
      await deploy.deploy();
      logger.info(`Exiting so that I restart. See you soon!`);
      process.exit(1);
    }
  };

  lifecycle.onReady(async () => {
    await github.monitorRepo({
      owner: config.auto_deploy.GITHUB_REPO_OWNER,
      repo: config.auto_deploy.GITHUB_REPO,
      callback: onPush,
    });
  });
}
