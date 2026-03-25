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
      logger.info(JSON.stringify(logs, null, 2));
      setTimeout(async () => {
        const moreLogs = await client.getSmartlockLogs(apiLock.smartlockId, now);
        logger.info(JSON.stringify(moreLogs, null, 2));
      }, 30_000);
    }
  };

  return { getLogs };
}
