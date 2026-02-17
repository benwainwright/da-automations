import { TServiceParams } from "@digital-alchemy/core";
import { execa } from "execa";
import { join } from "path";
import git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";

export function DeployService({ config, logger, auto_deploy }: TServiceParams) {
  const DEPLOY_CANCELLED = "DEPLOY_CANCELLED";
  let runNonce = 0;

  const ensureCurrentRun = (runId: number) => {
    if (runId !== runNonce) {
      throw new Error(DEPLOY_CANCELLED);
    }
  };

  const cancel = () => {
    runNonce += 1;
    logger.warn(`Cancelling in-progress deploy`);
    void auto_deploy?.lifecycle?.emit({
      type: "deploy.cancel.requested",
    });
  };

  const deploy = async () => {
    const runId = ++runNonce;
    logger.info(`Starting code deploy!`);
    await auto_deploy?.lifecycle?.emit({
      type: "deploy.started",
      runId,
    });

    const CLONE_FOLDER_NAME = "cloned-repo";

    const repo = `https://github.com/${config.auto_deploy.GITHUB_REPO_OWNER}/${config.auto_deploy.GITHUB_REPO}`;

    logger.info(`Clearing previous`);

    const clonePath = join(process.cwd(), CLONE_FOLDER_NAME);

    await execa("rm", [`-rf`, clonePath]);
    ensureCurrentRun(runId);

    await git.clone({ fs, http, dir: clonePath, url: repo });
    ensureCurrentRun(runId);

    logger.info(`Repo cloned. Installing dependencies`);
    await execa(`bun`, [`install`], { cwd: `${clonePath}/` });
    ensureCurrentRun(runId);

    logger.info(`Deploying code...`);
    await execa(`bun`, [`run`, `build`], { cwd: `${clonePath}/` });
    ensureCurrentRun(runId);

    logger.info(`Deploy complete!`);
    await auto_deploy?.lifecycle?.emit({
      type: "deploy.completed",
      runId,
    });
  };

  return { cancel, deploy, DEPLOY_CANCELLED };
}
