import { TServiceParams } from "@digital-alchemy/core";

export function LockService({
  context,
  hass,
  nuki,
  synapse,
  bens_flat: { entityIds },
}: TServiceParams) {
  const lock = hass.refBy.id(entityIds.lock.frontDoor);
  const door = hass.refBy.id(entityIds.binarySensor.frontDoor);

  const quickLockMode = synapse.switch({
    name: "QuickLock mode",
    context,
    suggested_object_id: "quickLock",
  });

  door.onUpdate(async (newState, oldState) => {
    if (!newState || !oldState) return;
    if (
      newState.state === "off" &&
      oldState.state === "on" &&
      lock.state === "unlocked" &&
      quickLockMode.is_on
    ) {
      await lock.lock();
    }
  });

  lock.onUpdate(async (newState, oldState) => {
    if (!oldState) return;
    if (oldState.state === "locked" && newState.state === "unlocking") {
      await nuki.api.getLogs(lock.attributes.friendly_name);
    } else if (oldState.state === "unlocked" && newState.state === "locking") {
    }
  });

  return { quickLockMode };
}
