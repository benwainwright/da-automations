import { TOffset, TServiceParams } from "@digital-alchemy/core";
import { ITrainer } from "./i-trainer.ts";
import { CsvDataStore } from "./csv-data-store/csv-data-store.ts";
import { cwd } from "node:process";
import { join } from "node:path";

export function LearningSensorService({ hass, lifecycle, scheduler }: TServiceParams) {
  const makeSensor = <TSample extends object>(
    name: string,
    trainer: ITrainer<TSample>,
    heartbeatInterval: TOffset,
  ) => {
    lifecycle.onReady(() => {
      const prefix = `${name}-sensor-`;
      const storage = new CsvDataStore<TSample>(prefix, join(cwd(), ".sensors"));
      const entities = trainer.watchedEntities();
      let lastWrittenAt = 0;

      const saveSample = async (reason: string) => {
        if (await trainer.shouldSample(reason, lastWrittenAt)) {
          const sample = await trainer.createSample(reason);
          await storage.save(sample);
          lastWrittenAt = Date.now();
        }
      };

      entities.forEach((entity) =>
        hass.refBy.id(entity).onUpdate(async () => await saveSample(entity)),
      );

      void saveSample("startup");
      scheduler.setInterval(async () => await saveSample("heartbeat"), heartbeatInterval);
    });
  };

  return { makeSensor };
}
