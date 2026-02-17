import { beforeEach, expect, mock, test } from "bun:test";

const getWebhook = mock(async () => ({ data: { id: 123 } }));
const deleteWebhook = mock(async () => {});
const createWebhook = mock(async () => ({ data: { id: 999 } }));
const readFile = mock(async () => "{}");
const writeFile = mock(async () => {});

mock.module("octokit", () => ({
  Octokit: class {
    constructor(_options: { auth: string }) {}
    rest = {
      repos: {
        createWebhook,
        deleteWebhook,
        getWebhook,
      },
    };
  },
}));

mock.module("fs/promises", () => ({
  readFile,
  writeFile,
}));

const { GithubService } = await import("../libraries/auto-deploy/services/github-service.ts");

beforeEach(() => {
  mock.clearAllMocks();
});

test("registers local webhook endpoint and creates a GitHub webhook", async () => {
  let registeredConfig: any;
  const webhookRegister = mock(async (config: any) => {
    registeredConfig = config;
  });
  const callback = mock(() => {});
  const service = GithubService({
    auto_deploy: { webhook: { register: webhookRegister } },
    config: {
      auto_deploy: {
        EXTERNAL_URL: "https://example.com",
        GITHUB_PAT: "token",
      },
    },
    logger: {
      error: mock(() => {}),
      info: mock(() => {}),
    },
  } as any);

  await service.monitorRepo({
    callback,
    owner: "benwainwright",
    repo: "da-automations",
  });

  expect(webhookRegister).toHaveBeenCalledTimes(1);
  expect(registeredConfig.webhookId).toBe("github-repo-monitor-benwainwright-da-automations");
  expect(registeredConfig.allowedMethods).toEqual(["POST"]);
  expect(registeredConfig.localOnly).toBe(false);
  expect(typeof registeredConfig.callback).toBe("function");

  expect(createWebhook).toHaveBeenCalledTimes(1);
  expect(createWebhook).toHaveBeenCalledWith({
    active: true,
    config: {
      content_type: "json",
      url: "https://example.com/api/webhook/github-repo-monitor-benwainwright-da-automations",
    },
    events: ["push"],
    name: "web",
    owner: "benwainwright",
    repo: "da-automations",
  });

  expect(writeFile).toHaveBeenCalledTimes(1);
  const writeFileCalls = (writeFile as any).mock.calls as Array<[string, string]>;
  expect(writeFileCalls[0]?.[0]).toBe("hooks.json");
  expect(JSON.parse(String(writeFileCalls[0]?.[1]))).toEqual({
    "github-repo-monitor-benwainwright-da-automations": 999,
  });
});

test("deletes previously stored webhook id before creating a new one", async () => {
  readFile.mockResolvedValueOnce(
    JSON.stringify({ "github-repo-monitor-benwainwright-da-automations": 44 }),
  );
  const service = GithubService({
    auto_deploy: { webhook: { register: mock(async () => {}) } },
    config: {
      auto_deploy: {
        EXTERNAL_URL: "https://example.com",
        GITHUB_PAT: "token",
      },
    },
    logger: {
      error: mock(() => {}),
      info: mock(() => {}),
    },
  } as any);

  await service.monitorRepo({
    callback: mock(() => {}),
    owner: "benwainwright",
    repo: "da-automations",
  });

  expect(getWebhook).toHaveBeenCalledWith({
    hook_id: 44,
    owner: "benwainwright",
    repo: "da-automations",
  });
  expect(deleteWebhook).toHaveBeenCalledWith({
    hook_id: 44,
    owner: "benwainwright",
    repo: "da-automations",
  });
});

test("logs and swallows errors while registering repository webhook", async () => {
  createWebhook.mockRejectedValueOnce(new Error("boom"));
  const logger = {
    error: mock(() => {}),
    info: mock(() => {}),
  };
  const service = GithubService({
    auto_deploy: { webhook: { register: mock(async () => {}) } },
    config: {
      auto_deploy: {
        EXTERNAL_URL: "https://example.com",
        GITHUB_PAT: "token",
      },
    },
    logger,
  } as any);

  await service.monitorRepo({
    callback: mock(() => {}),
    owner: "benwainwright",
    repo: "da-automations",
  });

  expect(logger.error).toHaveBeenCalledTimes(1);
  expect((logger.error as any).mock.calls[0]?.[0]).toBe("Failed to register webhook");
});
