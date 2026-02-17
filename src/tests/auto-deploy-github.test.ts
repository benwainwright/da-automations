import { beforeEach, expect, mock, test } from "bun:test";

const createWebhook = mock(async () => ({ data: { id: 999 } }));
const updateWebhook = mock(async () => ({ data: { id: 44 } }));
const listWebhooks = mock(async () => ({
  data: [] as Array<{ id: number; config: { url?: string } }>,
}));

mock.module("octokit", () => ({
  Octokit: class {
    constructor(_options: { auth: string }) {}
    rest = {
      repos: {
        createWebhook,
        listWebhooks,
        updateWebhook,
      },
    };
  },
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
  expect(listWebhooks).toHaveBeenCalledTimes(1);
  expect(createWebhook).toHaveBeenCalledTimes(1);
  expect(updateWebhook).not.toHaveBeenCalled();
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
});

test("always resolves hooks from GitHub by callback url (stateless)", async () => {
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

  expect(listWebhooks).toHaveBeenCalledWith({
    owner: "benwainwright",
    per_page: 100,
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
