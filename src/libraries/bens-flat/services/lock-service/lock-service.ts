import { TServiceParams } from "@digital-alchemy/core";

export function LockService({ hass, nuki }: TServiceParams) {
  const lock = hass.refBy.id("lock.front_door");

  lock.onUpdate(async (newState, oldState) => {
    if (oldState.state === "locked" && newState.state === "unlocking") {
      const now = new Date();
      const locks = await nuki.api.getSmartlocks();

      const apiLock = locks.find((apiLock) => apiLock.name === lock.attributes.friendly_name);

      if (apiLock) {
        const logs = await nuki.api.getSmartlockLogs(apiLock.smartlockId, now);
        console.log(logs);
        setTimeout(async () => {
          const moreLogs = await nuki.api.getSmartlockLogs(apiLock.smartlockId, now);
          console.log(moreLogs);
        }, 6000);
      }
    } else if (oldState.state === "unlocked" && newState.state === "locking") {
    }
  });
}
