import { ApiClient } from "./client.ts";
import { INukiClient } from "./i-client.ts";
import { NukiApi } from "./nuki-api.ts";

export const getClient = (token: string): INukiClient => {
  const rawClient = new ApiClient(token);
  return new NukiApi(rawClient);
};
