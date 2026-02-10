import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY, RemoveCallback } from "@digital-alchemy/hass";

export function SceneService({ hass, lifecycle }: TServiceParams) {
  const toggle = ({
    scene,
    snapshot,
    transition,
  }: {
    scene: PICK_ENTITY<"scene">;
    transition?: number;
    snapshot: PICK_ENTITY | PICK_ENTITY[];
  }) => {
    const id = `${scene.split(".")[1]}_off`;

    let removeOffCallback: RemoveCallback | undefined;
    const onCallbacks: (() => Promise<void> | void)[] = [];
    const offCallbacks: (() => Promise<void> | void)[] = [];

    const on = async () => {
      await hass.call.scene.create({
        scene_id: id,
        snapshot_entities: snapshot,
      });

      await hass.call.scene.turn_on({
        transition,
        entity_id: scene,
      });

      const theOffScene = hass.refBy.id(id as PICK_ENTITY<"scene">);

      removeOffCallback = theOffScene.onUpdate(async () => {
        for (const callback of offCallbacks) {
          await callback();
        }
      });
    };

    const off = async () => {
      await hass.call.scene.turn_on({
        transition,
        entity_id: `scene.${id}` as PICK_ENTITY<"scene">,
      });

      await hass.call.scene.delete({
        entity_id: `scene.${id}` as PICK_ENTITY<"scene">,
      });
      removeOffCallback?.remove();
    };

    const theScene = hass.refBy.id(scene);

    lifecycle.onReady(() => {
      theScene.onUpdate(async () => {
        for (const callback of onCallbacks) {
          await callback();
        }
      });
    });

    const onOn = (callback: () => Promise<void> | void) => {
      onCallbacks.push(callback);
    };

    const onOff = (callback: () => Promise<void> | void) => {
      offCallbacks.push(callback);
    };

    return { on, off, onOn, onOff };
  };

  return { toggle };
}
