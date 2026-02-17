import { mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { TOffset, TServiceParams } from "@digital-alchemy/core";

const SAMPLE_INTERVAL: TOffset = "2m";
const SAMPLE_MIN_INTERVAL_SECONDS = 20;
const SAMPLE_FORCE_INTERVAL_SECONDS = 120;
const SAMPLE_MIN_DISTANCE_DELTA_METERS = 5;
const SAMPLE_MIN_SPEED_DELTA_MPS = 0.25;

const CSV_COLUMNS = [
  "sample_id",
  "timestamp_utc",
  "trigger_reason",
  "timestamp",
  "distanceFromHome",
  "speedInMetersPerSecond30s",
  "speedInMetersPerSecond2m",
  "speedInMetersPerSecond10m",
  "distanceDelta2m",
  "distanceDelta10m",
  "rollingSpeedStd10m",
  "zoneOneHotHome",
  "zoneOneHotNotHome",
  "zoneOneHotWork",
  "zoneOneHotGym",
  "cameFromWork",
  "cameFromGym",
  "movingTowardHome",
  "accelerationMetersPerSecondSquared",
  "etaToHomeSeconds",
  "isWeekend",
  "hourOfDaySin",
  "hourOfDayCos",
  "dayOfWeekSin",
  "dayOfWeekCos",
  "speedHistoryPointCount",
  "speedInMetersPerSecond",
] as const;

type SampleShape = Record<(typeof CSV_COLUMNS)[number], string | number>;

export function GoingHomeRecorderService({
  bens_flat,
  hass,
  lifecycle,
  logger,
  scheduler,
}: TServiceParams) {
  let lastWrittenAt = 0;
  let lastSample: SampleShape | undefined;
  let writeChain = Promise.resolve();

  const getSampleDir = () => process.env.GOING_HOME_SAMPLE_DIR ?? "data/going-home";

  const csvEscape = (value: unknown) => {
    const stringValue = String(value ?? "");
    if (stringValue.includes(",") || stringValue.includes(`"`) || stringValue.includes("\n")) {
      return `"${stringValue.replaceAll(`"`, `""`)}"`;
    }
    return stringValue;
  };

  const getDailyFilePath = (now = new Date()) => {
    const date = now.toISOString().slice(0, 10);
    return join(getSampleDir(), `going-home-samples-${date}.csv`);
  };

  const ensureHeader = (filePath: string) => {
    if (existsSync(filePath)) {
      return;
    }
    mkdirSync(getSampleDir(), { recursive: true });
    appendFileSync(filePath, `${CSV_COLUMNS.join(",")}\n`, "utf8");
  };

  const toNumber = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const shouldWrite = (sample: SampleShape, force = false) => {
    if (force || !lastSample) {
      return true;
    }

    const elapsedSeconds = (Date.now() - lastWrittenAt) / 1000;
    if (elapsedSeconds >= SAMPLE_FORCE_INTERVAL_SECONDS) {
      return true;
    }

    if (elapsedSeconds < SAMPLE_MIN_INTERVAL_SECONDS) {
      return false;
    }

    const distanceDelta = Math.abs(
      toNumber(sample.distanceFromHome) - toNumber(lastSample.distanceFromHome),
    );
    const speedDelta = Math.abs(
      toNumber(sample.speedInMetersPerSecond) - toNumber(lastSample.speedInMetersPerSecond),
    );
    const movingTowardHomeChanged =
      toNumber(sample.movingTowardHome) !== toNumber(lastSample.movingTowardHome);
    const zoneChanged =
      toNumber(sample.zoneOneHotHome) !== toNumber(lastSample.zoneOneHotHome) ||
      toNumber(sample.zoneOneHotNotHome) !== toNumber(lastSample.zoneOneHotNotHome) ||
      toNumber(sample.zoneOneHotWork) !== toNumber(lastSample.zoneOneHotWork) ||
      toNumber(sample.zoneOneHotGym) !== toNumber(lastSample.zoneOneHotGym);

    return (
      distanceDelta >= SAMPLE_MIN_DISTANCE_DELTA_METERS ||
      speedDelta >= SAMPLE_MIN_SPEED_DELTA_MPS ||
      movingTowardHomeChanged ||
      zoneChanged
    );
  };

  const writeSample = async (triggerReason: string, force = false) => {
    const payload = (await bens_flat.goingHome.getSample()) as Record<string, unknown>;
    const now = new Date();
    const sample = {
      sample_id: randomUUID(),
      timestamp_utc: now.toISOString(),
      trigger_reason: triggerReason,
      ...payload,
    } as SampleShape;

    if (!shouldWrite(sample, force)) {
      return;
    }

    const filePath = getDailyFilePath(now);
    ensureHeader(filePath);
    const row = CSV_COLUMNS.map((column) => csvEscape(sample[column] ?? "")).join(",");
    appendFileSync(filePath, `${row}\n`, "utf8");

    lastSample = sample;
    lastWrittenAt = Date.now();
  };

  const enqueueWrite = (triggerReason: string, force = false) => {
    writeChain = writeChain
      .then(() => writeSample(triggerReason, force))
      .catch((error) => {
        logger.error({ error, triggerReason }, `failed to record going-home sample`);
      });
  };

  lifecycle.onReady(() => {
    const distance = hass.refBy.id("sensor.home_proximity_ben_distance");
    const direction = hass.refBy.id("sensor.home_proximity_ben_direction_of_travel");
    const person = hass.refBy.id("person.ben");

    enqueueWrite("startup", true);

    distance.onUpdate(() => enqueueWrite("distance_update"));
    direction.onUpdate(() => enqueueWrite("direction_update"));
    person.onUpdate((_newState, oldState) => {
      const zoneChanged = _newState?.state !== oldState?.state;
      enqueueWrite(zoneChanged ? "person_zone_change" : "person_update", zoneChanged);
    });

    scheduler.setInterval(() => {
      if (person.state !== "home") {
        enqueueWrite("interval_tick");
      }
    }, SAMPLE_INTERVAL);
  });

  return {
    recordNow: (reason = "manual", force = true) => {
      enqueueWrite(reason, force);
      return writeChain;
    },
    waitForIdle: async () => await writeChain,
  };
}
