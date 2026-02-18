import { PICK_ENTITY } from "@digital-alchemy/hass";

export interface ITrainer<TSample> {
  createSample(reason: string): TSample | Promise<TSample>;
  shouldSample(reason: string, lastWrittenAt: number): Promise<boolean> | boolean;
  watchedEntities(): PICK_ENTITY[];
}
