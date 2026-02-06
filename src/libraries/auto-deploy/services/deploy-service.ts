import { TServiceParams } from "@digital-alchemy/core";
import { execa } from "execa";
import { join } from "path";
import git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";

export function DeployService({ config, hass, logger }: TServiceParams) {
  const getSlug = async () => {
    const { stdout } = await execa`ha addon info --raw-output`;
    const data = JSON.parse(stdout);
    return data.slug;
  };

  const restart = async () => {
    const slug = await getSlug();
    logger.info(`Restarting ${slug}`);
    await execa`ha addons restart ${slug}`;
  };

  const deploy = async () => {
    logger.info(`Starting code deploy!`);
    hass.diagnostics.fetch;

    const CLONE_FOLDER_NAME = "cloned-repo";

    const repo = `https://github.com/${config.auto_deploy.GITHUB_REPO_OWNER}/${config.auto_deploy.GITHUB_REPO}`;

    logger.info(`Clearing previous`);

    const clonePath = join(process.cwd(), CLONE_FOLDER_NAME);

    await execa("rm", [`-rf`, clonePath]);
    await git.clone({ fs, http, dir: clonePath, url: repo });
    logger.info(`Repo cloned. Installing dependencies`);
    await execa(`bun`, [`install`], { cwd: `${clonePath}/` });
    logger.info(`Deploying code...`);
    await execa(`bun`, [`run`, `build`], { cwd: `${clonePath}/` });

    logger.info(`Deploy complete!`);
  };

  return { deploy, restart };
}
