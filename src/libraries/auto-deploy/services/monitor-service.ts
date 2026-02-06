import { TServiceParams } from "@digital-alchemy/core";

export function MonitorService({
  config,
  lifecycle,
  auto_deploy: { github, deploy },
  logger,
}: TServiceParams) {
  lifecycle.onReady(async () => {
    await github.monitorRepo({
      owner: config.auto_deploy.GITHUB_REPO_OWNER,
      repo: config.auto_deploy.GITHUB_REPO,
      callback: async (data) => {
        if (data.ref === "refs/heads/main") {
          logger.info(`Someone pushed to main. Deploying the latest version`);
          await deploy.deploy();
          logger.info(`Code deployed exiting so that I restart. See you soon!`);
          process.exit();
        }
      },
    });
  });
}
