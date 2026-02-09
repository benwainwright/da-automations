import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

export function SceneService({ hass }: TServiceParams) {
  const toggle = ({
    scene,
    snapshot,
  }: {
    scene: PICK_ENTITY<"scene">;
    snapshot: PICK_ENTITY | PICK_ENTITY[];
  }) => {
    const id = `${scene.split(".")[1]}_off`;

    const on = async () => {
      await hass.call.scene.create({
        scene_id: id,
        snapshot_entities: snapshot,
      });

      await hass.call.scene.turn_on({
        entity_id: scene,
      });
    };

    const off = async () => {
      await hass.call.scene.turn_on({
        entity_id: `scene.${id}` as PICK_ENTITY<"scene">,
      });

      await hass.call.scene.delete({
        entity_id: `scene.${id}` as PICK_ENTITY<"scene">,
      });
    };

    return { on, off };
  };

  return { toggle };
}
