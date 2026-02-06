import { TServiceParams } from "@digital-alchemy/core";

export function MonitorService({
  config,
  lifecycle,
  auto_deploy: { github },
  logger,
}: TServiceParams) {
  lifecycle.onReady(async () => {
    await github.monitorRepo({
      owner: config.auto_deploy.GITHUB_REPO_OWNER,
      repo: config.auto_deploy.GITHUB_REPO,
      callback: (data) => {
        logger.info(data);
      },
    });
  });
}
