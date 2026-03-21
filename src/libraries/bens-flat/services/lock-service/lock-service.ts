import { TServiceParams } from "@digital-alchemy/core";

export function LockService({ hass, nuki }: TServiceParams) {
  const lock = hass.refBy.id("lock.front_door");

  lock.onUpdate(async (newState, oldState) => {
    if (oldState.state === "locked" && newState.state === "unlocking") {
      await nuki.api.getLogs(lock.attributes.friendly_name);
    } else if (oldState.state === "unlocked" && newState.state === "locking") {
    }
  });
}
