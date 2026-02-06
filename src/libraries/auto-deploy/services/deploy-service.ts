import { TServiceParams } from "@digital-alchemy/core";
import { join } from "node:path/win32";
import { execa } from "execa";
import { simpleGit } from "simple-git";

export function DeployService({ config, hass }: TServiceParams) {
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
    const git = simpleGit();

    const CLONE_PATH = "cloned-repo";

    git.clone(config.auto_deploy.GITHUB_REPO, [CLONE_PATH]);

    process.chdir(join(process.cwd(), CLONE_PATH));
    await execa`bun install;`;
    await execa`bun run build`;
    await restartAddon();
  };

  return { deploy };
}
