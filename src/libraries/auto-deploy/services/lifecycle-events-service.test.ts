import { expect, mock, test } from "bun:test";
import { LifecycleEventsService } from "./lifecycle-events-service.ts";

type LocalLifecycleEvent =
  | { type: "deploy.started"; runId: number }
  | { type: "restart.requested" };

test("listen(callback) receives strongly-typed lifecycle events", async () => {
  const service = LifecycleEventsService({
    logger: { error: mock(() => {}) },
  } as any);

  const seen: LocalLifecycleEvent[] = [];
  service.listen((event) => {
    if (event.type === "deploy.started") {
      // compile-time check: runId only exists on deploy.started
      expect(typeof event.runId).toBe("number");
      seen.push({ type: "deploy.started", runId: event.runId });
      return;
    }
    if (event.type === "restart.requested") {
      seen.push({ type: "restart.requested" });
    }
  });

  await service.emit({
    type: "deploy.started",
    runId: 1,
  });
  await service.emit({
    type: "restart.requested",
  });

  expect(seen).toEqual([{ type: "deploy.started", runId: 1 }, { type: "restart.requested" }]);
});

test("listen() returns removable callback handle", async () => {
  const service = LifecycleEventsService({
    logger: { error: mock(() => {}) },
  } as any);

  const callback = mock(() => {});
  const handle = service.listen(callback);
  handle.remove();

  await service.emit({
    type: "restart.requested",
  });

  expect(callback).not.toHaveBeenCalled();
});
