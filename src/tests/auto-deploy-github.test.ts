import { beforeEach, expect, mock, test } from "bun:test";

const getWebhook = mock(async () => ({
  data: { config: { url: "https://example.com/hook" }, id: 123 },
}));
const createWebhook = mock(async () => ({ data: { id: 999 } }));
const updateWebhook = mock(async () => ({ data: { id: 555 } }));
const listWebhooks = mock(async () => ({
  data: [] as Array<{ id: number; config: { url?: string } }>,
}));
const readFile = mock(async () => "{}");
const writeFile = mock(async () => {});

mock.module("octokit", () => ({
  Octokit: class {
    constructor(_options: { auth: string }) {}
    rest = {
      repos: {
        createWebhook,
        getWebhook,
        listWebhooks,
        updateWebhook,
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

test("registers local endpoint and creates webhook when none exists", async () => {
  const webhookRegister = mock(async (_config: any) => {});
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
  expect(createWebhook).toHaveBeenCalledTimes(1);
  expect(updateWebhook).not.toHaveBeenCalled();
  expect(writeFile).toHaveBeenCalledTimes(1);

  const writeFileCalls = (writeFile as any).mock.calls as Array<[string, string]>;
  expect(JSON.parse(String(writeFileCalls[0]?.[1]))).toEqual({
    "github-repo-monitor-benwainwright-da-automations": 999,
  });
});

test("local-dev case: missing local hook id but existing GitHub webhook is updated and reused", async () => {
  listWebhooks.mockResolvedValueOnce({
    data: [
      {
        id: 44,
        config: {
          url: "https://example.com/api/webhook/github-repo-monitor-benwainwright-da-automations",
        },
      },
    ],
  });

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

  expect(createWebhook).not.toHaveBeenCalled();
  expect(updateWebhook).toHaveBeenCalledWith({
    active: true,
    config: {
      content_type: "json",
      url: "https://example.com/api/webhook/github-repo-monitor-benwainwright-da-automations",
    },
    events: ["push"],
    hook_id: 44,
    owner: "benwainwright",
    repo: "da-automations",
  });

  const writeFileCalls = (writeFile as any).mock.calls as Array<[string, string]>;
  expect(JSON.parse(String(writeFileCalls[0]?.[1]))).toEqual({
    "github-repo-monitor-benwainwright-da-automations": 44,
  });
});

test("reuses stored hook id when it exists and target url still matches", async () => {
  readFile.mockResolvedValueOnce(
    JSON.stringify({ "github-repo-monitor-benwainwright-da-automations": 77 }),
  );
  getWebhook.mockResolvedValueOnce({
    data: {
      config: {
        url: "https://example.com/api/webhook/github-repo-monitor-benwainwright-da-automations",
      },
      id: 77,
    },
  });

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
    hook_id: 77,
    owner: "benwainwright",
    repo: "da-automations",
  });
  expect(updateWebhook).toHaveBeenCalledWith(
    expect.objectContaining({
      hook_id: 77,
      owner: "benwainwright",
      repo: "da-automations",
    }),
  );
  expect(createWebhook).not.toHaveBeenCalled();
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
