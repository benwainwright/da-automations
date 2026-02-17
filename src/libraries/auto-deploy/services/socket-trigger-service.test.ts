import { beforeEach, expect, mock, test } from "bun:test";
import { SocketTriggerService } from "./socket-trigger-service.ts";

const logger = {
  error: mock(() => {}),
  info: mock(() => {}),
};

type Handler = (message: any) => Promise<void> | void;

const buildSocket = () => {
  let nextId = 1;
  let onConnectCallback: (() => Promise<void> | void) | undefined;
  const handlers = new Map<string, Handler[]>();
  const sendMessage = mock(async (data: { id?: number }, _waitForResponse?: boolean) => {
    data.id = nextId++;
  });
  const registerMessageHandler = mock((type: string, callback: Handler) => {
    const existing = handlers.get(type) ?? [];
    existing.push(callback);
    handlers.set(type, existing);
  });
  const onConnect = mock((callback: () => Promise<void> | void) => {
    onConnectCallback = callback;
    return { remove: () => {} };
  });

  return {
    emit: async (type: string, message: any) => {
      for (const callback of handlers.get(type) ?? []) {
        await callback(message);
      }
    },
    handlers,
    onConnect,
    sendMessage,
    socket: {
      onConnect,
      registerMessageHandler,
      sendMessage,
    },
    triggerConnect: async () => {
      await onConnectCallback?.();
    },
  };
};

beforeEach(() => {
  mock.clearAllMocks();
});

test("registers trigger and dispatches event payloads after result acknowledgment", async () => {
  const harness = buildSocket();
  const callback = mock(() => {});

  const service = SocketTriggerService({
    hass: { socket: harness.socket },
    logger,
  } as any);

  await service.register({
    callback,
    id: "webhook-a",
    trigger: { trigger: "webhook", webhook_id: "webhook-a" },
  });

  expect(harness.sendMessage).toHaveBeenCalledTimes(1);
  expect(harness.sendMessage.mock.calls[0]?.[0]).toMatchObject({
    trigger: { trigger: "webhook", webhook_id: "webhook-a" },
    type: "subscribe_trigger",
  });

  await harness.emit("result", { id: 1, type: "result" });
  await harness.emit("event", {
    id: 1,
    type: "event",
    event: {
      variables: {
        trigger: { json: { ref: "refs/heads/main" } },
      },
    },
  });

  expect(callback).toHaveBeenCalledWith({ ref: "refs/heads/main" });
});

test("logs and skips callbacks when event payload is missing json", async () => {
  const harness = buildSocket();
  const callback = mock(() => {});
  const service = SocketTriggerService({
    hass: { socket: harness.socket },
    logger,
  } as any);

  await service.register({
    callback,
    id: "webhook-b",
    trigger: { trigger: "webhook", webhook_id: "webhook-b" },
  });
  await harness.emit("result", { id: 1, type: "result" });
  await harness.emit("event", {
    id: 1,
    type: "event",
    event: { variables: { trigger: {} } },
  });

  expect(callback).not.toHaveBeenCalled();
  expect(logger.info).toHaveBeenCalledWith("Socket trigger payload was not valid JSON: webhook-b");
});

test("re-subscribes all registered triggers on reconnect", async () => {
  const harness = buildSocket();
  const callbackA = mock(() => {});
  const callbackB = mock(() => {});
  const service = SocketTriggerService({
    hass: { socket: harness.socket },
    logger,
  } as any);

  await service.register({
    callback: callbackA,
    id: "webhook-a",
    trigger: { trigger: "webhook", webhook_id: "webhook-a" },
  });
  await service.register({
    callback: callbackB,
    id: "webhook-b",
    trigger: { trigger: "webhook", webhook_id: "webhook-b" },
  });

  expect(harness.sendMessage).toHaveBeenCalledTimes(2);

  await harness.triggerConnect();
  expect(harness.sendMessage).toHaveBeenCalledTimes(4);

  await harness.emit("result", { id: 3, type: "result" });
  await harness.emit("event", {
    id: 3,
    type: "event",
    event: { variables: { trigger: { json: { ping: true } } } },
  });

  expect(callbackA).toHaveBeenCalledWith({ ping: true });
  expect(callbackB).not.toHaveBeenCalled();
});
