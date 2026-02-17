import { beforeEach, expect, mock, test } from "bun:test";

const clone = mock(async () => {});
const execa = mock(async () => {});

mock.module("isomorphic-git", () => ({
  default: { clone },
}));

mock.module("execa", () => ({
  execa,
}));

const { DeployService } = await import("./deploy-service.ts");

beforeEach(() => {
  mock.clearAllMocks();
});

test("clones, installs, and builds in deployment order", async () => {
  const logger = {
    info: mock(() => {}),
  };

  const service = DeployService({
    config: {
      auto_deploy: {
        GITHUB_REPO: "da-automations",
        GITHUB_REPO_OWNER: "benwainwright",
      },
    },
    hass: { diagnostics: { fetch: {} } },
    logger,
  } as any);

  await service.deploy();

  const clonePath = `${process.cwd()}/cloned-repo`;
  expect(execa).toHaveBeenCalledTimes(3);
  expect(execa).toHaveBeenNthCalledWith(1, "rm", ["-rf", clonePath]);
  expect(execa).toHaveBeenNthCalledWith(2, "bun", ["install"], { cwd: `${clonePath}/` });
  expect(execa).toHaveBeenNthCalledWith(3, "bun", ["run", "build"], { cwd: `${clonePath}/` });

  expect(clone).toHaveBeenCalledTimes(1);
  expect(clone).toHaveBeenCalledWith(
    expect.objectContaining({
      dir: clonePath,
      url: "https://github.com/benwainwright/da-automations",
    }),
  );
});

test("cancel() aborts in-progress deploy shell commands", async () => {
  let resolveFirst: (() => void) | undefined;
  execa.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        resolveFirst = resolve;
      }),
  );

  const service = DeployService({
    config: {
      auto_deploy: {
        GITHUB_REPO: "da-automations",
        GITHUB_REPO_OWNER: "benwainwright",
      },
    },
    logger: { info: mock(() => {}), warn: mock(() => {}) },
  } as any);

  const deployPromise = service.deploy();
  while (!resolveFirst) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  service.cancel();
  resolveFirst?.();

  await expect(deployPromise).rejects.toThrow("DEPLOY_CANCELLED");
});
