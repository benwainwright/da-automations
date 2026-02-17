import { TServiceParams } from "@digital-alchemy/core";
import { PushEvent } from "@octokit/webhooks-types";

export function MonitorService({
  config,
  lifecycle,
  auto_deploy: { github, deploy },
  logger,
}: TServiceParams) {
  let deploying = false;
  let rerunRequested = false;

  const onPush = async (data: PushEvent) => {
    logger.info(`Push event received`);
    if (data.ref !== "refs/heads/main") {
      return;
    }
    if (deploying) {
      logger.info(
        `New push detected while deploying. Cancelling current deploy and queueing latest.`,
      );
      rerunRequested = true;
      deploy.cancel();
      return;
    }

    deploying = true;
    logger.info(`Someone pushed to main. Deploying the latest version`);
    try {
      do {
        rerunRequested = false;
        try {
          await deploy.deploy();
        } catch (error) {
          if (!(error instanceof Error) || error.message !== deploy.DEPLOY_CANCELLED) {
            throw error;
          }
          logger.info(`Deploy cancelled in favor of a newer push`);
        }
      } while (rerunRequested);

      logger.info(`Exiting so that I restart. See you soon!`);
      process.exit(1);
    } finally {
      deploying = false;
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
