import { TServiceParams } from "@digital-alchemy/core";
import { getClient } from "./client/get-client.ts";

export function ApiService({ config }: TServiceParams) {
  const client = getClient(config.nuki.NUKI_API_TOKEN);

  return client;
}
