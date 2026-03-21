import { TServiceParams } from "@digital-alchemy/core";
import { getClient } from "./client/get-client.ts";

export function ApiService({ config, logger }: TServiceParams) {
  const getLogs = async (name: string) => {
    const now = new Date();
    const client = getClient(config.nuki.NUKI_API_TOKEN);
    const locks = await client.getSmartlocks();

    const apiLock = locks.find((apiLock) => apiLock.name === name);

    if (apiLock) {
      const logs = await client.getSmartlockLogs(apiLock.smartlockId, now);
      logger.info(logs);
      setTimeout(async () => {
        const moreLogs = await client.getSmartlockLogs(apiLock.smartlockId, now);
        logger.info(moreLogs);
      }, 6000);
    }
  };

  return { getLogs };
}
