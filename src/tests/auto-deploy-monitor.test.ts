import { beforeEach, expect, mock, test } from "bun:test";

const { MonitorService } = await import("../libraries/auto-deploy/services/monitor-service.ts");

const exitSpy = mock(() => {
  throw new Error("exit called");
});

beforeEach(() => {
  mock.clearAllMocks();
  process.exit = exitSpy as typeof process.exit;
});

test("registers GitHub monitor on ready with configured owner/repo", async () => {
  let onReady: (() => Promise<void>) | undefined;
  const monitorRepo = mock(async () => {});

  MonitorService({
    config: {
      auto_deploy: {
        GITHUB_REPO: "da-automations",
        GITHUB_REPO_OWNER: "benwainwright",
      },
    },
    lifecycle: {
      onReady: (callback: () => Promise<void>) => {
        onReady = callback;
      },
    },
    auto_deploy: {
      deploy: { deploy: mock(async () => {}) },
      github: { monitorRepo },
    },
    logger: { info: mock(() => {}) },
  } as any);

  await onReady?.();

  expect(monitorRepo).toHaveBeenCalledTimes(1);
  const monitorRepoCalls = (monitorRepo as any).mock.calls as Array<
    [{ owner: string; repo: string; callback: unknown }]
  >;
  expect(monitorRepoCalls[0]?.[0]).toMatchObject({
    owner: "benwainwright",
    repo: "da-automations",
  });
  expect(typeof monitorRepoCalls[0]?.[0]?.callback).toBe("function");
});

test("deploys and triggers restart when main branch push arrives", async () => {
  let onReady: (() => Promise<void>) | undefined;
  let pushCallback: ((data: { ref: string }) => Promise<void>) | undefined;
  const deploy = mock(async () => {});
  const monitorRepo = mock(
    async ({ callback }: { callback: (data: { ref: string }) => Promise<void> }) => {
      pushCallback = callback;
    },
  );

  MonitorService({
    config: {
      auto_deploy: {
        GITHUB_REPO: "da-automations",
        GITHUB_REPO_OWNER: "benwainwright",
      },
    },
    lifecycle: {
      onReady: (callback: () => Promise<void>) => {
        onReady = callback;
      },
    },
    auto_deploy: {
      deploy: { deploy },
      github: { monitorRepo },
    },
    logger: { info: mock(() => {}) },
  } as any);

  await onReady?.();
  try {
    await pushCallback?.({ ref: "refs/heads/main" });
  } catch (error) {
    expect((error as Error).message).toBe("exit called");
  }

  expect(deploy).toHaveBeenCalledTimes(1);
  expect(exitSpy).toHaveBeenCalledTimes(1);
  expect(exitSpy).toHaveBeenCalledWith(1);
});

test("ignores non-main push events", async () => {
  let onReady: (() => Promise<void>) | undefined;
  let pushCallback: ((data: { ref: string }) => Promise<void>) | undefined;
  const deploy = mock(async () => {});
  const monitorRepo = mock(
    async ({ callback }: { callback: (data: { ref: string }) => Promise<void> }) => {
      pushCallback = callback;
    },
  );

  MonitorService({
    config: {
      auto_deploy: {
        GITHUB_REPO: "da-automations",
        GITHUB_REPO_OWNER: "benwainwright",
      },
    },
    lifecycle: {
      onReady: (callback: () => Promise<void>) => {
        onReady = callback;
      },
    },
    auto_deploy: {
      deploy: { deploy },
      github: { monitorRepo },
    },
    logger: { info: mock(() => {}) },
  } as any);

  await onReady?.();
  await pushCallback?.({ ref: "refs/heads/feature/test" });

  expect(deploy).not.toHaveBeenCalled();
  expect(exitSpy).not.toHaveBeenCalled();
});
