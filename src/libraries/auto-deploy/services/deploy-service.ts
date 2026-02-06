import { TServiceParams } from "@digital-alchemy/core";
import { execa } from "execa";
import { join } from "path";
import git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";

export function DeployService({ config, hass, logger }: TServiceParams) {
  const restartAddon = async () => {
    await hass.fetch.fetch({
      headers: {
        Authorization: `Bearer ${process.env["SUPERVISOR_TOKEN"]}`,
      },
      method: "post",
      url: `/addons/${config.auto_deploy.ADDON_SLUG}/restart"`,
    });
  };

  const deploy = async () => {
    logger.info(`Starting deploy`);

    const CLONE_FOLDER_NAME = "cloned-repo";

    const repo = `https://github.com/${config.auto_deploy.GITHUB_REPO_OWNER}/${config.auto_deploy.GITHUB_REPO}`;

    logger.info(`Clearing previous`);

    const clonePath = join(process.cwd(), CLONE_FOLDER_NAME);

    await execa("rm", [`-rf`, clonePath]);

    await git.clone({ fs, http, dir: clonePath, url: repo });

    logger.info(`Repo cloned. Installing dependencies`);

    await execa(`bun`, [`install`], { cwd: `${clonePath}/` });
    await execa(`bun`, [`run`, `build`], { cwd: `${clonePath}/` });

    logger.info(`Deploy complete`);
    await restartAddon();
  };

  return { deploy };
}
