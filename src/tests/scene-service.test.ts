import { beforeEach, expect, mock, test } from "bun:test";
import { SceneService } from "../libraries/bens-flat/services/scene-service.ts";

type UpdateHandler = () => Promise<void> | void;

const makeHarness = () => {
  const sceneUpdateHandlers = new Map<string, UpdateHandler>();
  const remove = mock(() => {});

  const create = mock(async () => {});
  const turnOn = mock(async () => {});
  const deleteScene = mock(async () => {});

  const lifecycle = {
    onReady: (callback: () => void) => callback(),
  };

  const hass = {
    call: {
      scene: {
        create,
        delete: deleteScene,
        turn_on: turnOn,
      },
    },
    refBy: {
      id: (id: string) => ({
        onUpdate: (callback: UpdateHandler) => {
          sceneUpdateHandlers.set(id, callback);
          return { remove };
        },
      }),
    },
  };

  return {
    create,
    deleteScene,
    emitSceneUpdate: async (id: string) => {
      await sceneUpdateHandlers.get(id)?.();
    },
    hass,
    lifecycle,
    remove,
    turnOn,
  };
};

beforeEach(() => {
  mock.clearAllMocks();
});

test("off() is a no-op before on() creates snapshot scene", async () => {
  const harness = makeHarness();
  const service = SceneService({
    hass: harness.hass,
    lifecycle: harness.lifecycle,
  } as any);

  const toggler = service.toggle({
    scene: "scene.tv_mode",
    snapshot: ["light.kitchen_sink"],
    transition: 3,
  });

  await toggler.off();

  expect(harness.turnOn).not.toHaveBeenCalled();
  expect(harness.deleteScene).not.toHaveBeenCalled();
});

test("on() creates off snapshot and activates target scene", async () => {
  const harness = makeHarness();
  const service = SceneService({
    hass: harness.hass,
    lifecycle: harness.lifecycle,
  } as any);

  const toggler = service.toggle({
    scene: "scene.tv_mode",
    snapshot: ["light.kitchen_sink"],
    transition: 3,
  });

  await toggler.on();

  expect(harness.create).toHaveBeenCalledWith({
    scene_id: "tv_mode_off",
    snapshot_entities: ["light.kitchen_sink"],
  });
  expect(harness.turnOn).toHaveBeenCalledWith({
    transition: 3,
    entity_id: "scene.tv_mode",
  });
});

test("off() restores, deletes snapshot scene, and removes off listener after on()", async () => {
  const harness = makeHarness();
  const service = SceneService({
    hass: harness.hass,
    lifecycle: harness.lifecycle,
  } as any);

  const toggler = service.toggle({
    scene: "scene.tv_mode",
    snapshot: ["light.kitchen_sink"],
    transition: 3,
  });

  await toggler.on();
  await toggler.off();

  expect(harness.turnOn).toHaveBeenCalledWith({
    transition: 3,
    entity_id: "scene.tv_mode_off",
  });
  expect(harness.deleteScene).toHaveBeenCalledWith({
    entity_id: "scene.tv_mode_off",
  });
  expect(harness.remove).toHaveBeenCalledTimes(1);
});

test("onOn and onOff callbacks fire from their respective scene updates", async () => {
  const harness = makeHarness();
  const service = SceneService({
    hass: harness.hass,
    lifecycle: harness.lifecycle,
  } as any);

  const onCallback = mock(() => {});
  const offCallback = mock(() => {});

  const toggler = service.toggle({
    scene: "scene.tv_mode",
    snapshot: ["light.kitchen_sink"],
    transition: 3,
  });

  toggler.onOn(onCallback);
  toggler.onOff(offCallback);

  await harness.emitSceneUpdate("scene.tv_mode");
  expect(onCallback).toHaveBeenCalledTimes(1);

  await toggler.on();
  await harness.emitSceneUpdate("tv_mode_off");
  expect(offCallback).toHaveBeenCalledTimes(1);
});
