import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

export function CdService({
  context,
  hass,
  synapse,
  bens_flat: { notify, motion, mediaPlayer, lock, entityIds },
}: TServiceParams) {
  const cdSwitch = synapse.switch({
    name: "CD mode",
    context,
    suggested_object_id: "cd",
  });

  const quickLockState = "quicklock_state";

  cdSwitch.onTurnOn(async () => {
    await hass.call.scene.create({
      scene_id: quickLockState,
      snapshot_entities: lock.quickLockMode.entity_id,
    });
    await hass.call.switch.turn_on({
      entity_id: lock.quickLockMode.entity_id,
    });
  });

  cdSwitch.onTurnOff(async () => {
    await hass.call.scene.turn_on({
      entity_id: `scene.${quickLockState}` as PICK_ENTITY<"scene">,
    });

    await hass.call.scene.delete({
      entity_id: `scene.${quickLockState}` as PICK_ENTITY<"scene">,
    });
  });

  const doorOpen = hass.refBy.id(entityIds.binarySensor.frontDoor);

  doorOpen.onUpdate(async (newState, oldState) => {
    if (!newState || !oldState) return;
    if (newState.state === "on" && oldState.state === "off" && cdSwitch.is_on) {
      await mediaPlayer.playLocalMp3({
        file: "boop.mp3",
        player: "media_player.whole_flat",
      });
    }
  });

  const outOfBounds = async () => {
    if (cdSwitch.is_on) {
      await notify.notifyCritical({ message: "someone is out of bounds", title: "alert" });
    }
  };

  motion.spareRoom(outOfBounds);
  motion.bedroom(outOfBounds);

  return { cdSwitch };
}
