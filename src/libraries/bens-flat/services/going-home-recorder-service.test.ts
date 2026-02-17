import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { GoingHomeRecorderService } from "./going-home-recorder-service.ts";

type Callbacks = {
  onReady?: () => void;
};

type RecorderApi = {
  recordNow: (reason?: string, force?: boolean) => Promise<void>;
  waitForIdle: () => Promise<void>;
};

const createHarness = ({ sample }: { sample: Record<string, unknown> }) => {
  const callbacks: Callbacks = {};
  let personState = "not_home";
  const sampleDir = mkdtempSync(join(tmpdir(), "going-home-recorder-"));
  process.env.GOING_HOME_SAMPLE_DIR = sampleDir;

  const recorder = GoingHomeRecorderService({
    bens_flat: {
      goingHome: {
        getSample: mock(async () => sample),
      },
    },
    config: {
      bens_flat: {},
    },
    hass: {
      refBy: {
        id: (_entityId: string) => ({
          get state() {
            return personState;
          },
          onUpdate: () => {},
        }),
      },
    },
    lifecycle: {
      onReady: (callback: () => void) => {
        callbacks.onReady = callback;
      },
    },
    logger: {
      error: mock(() => {}),
      info: mock(() => {}),
    },
    scheduler: {
      setInterval: (_callback: () => void) => {},
    },
  } as any) as RecorderApi;

  const csvPath = () => {
    const files = readdirSync(sampleDir).filter((file) => file.endsWith(".csv"));
    return files.length ? join(sampleDir, files[0]) : undefined;
  };

  const lines = () => {
    const file = csvPath();
    if (!file) {
      return [];
    }
    return readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
  };

  const runReady = async () => {
    callbacks.onReady?.();
    await recorder.waitForIdle();
    await recorder.recordNow("bootstrap_manual", true);
  };

  return {
    callbacks,
    lines,
    runReady,
    sampleDir,
    recorder,
    flush: () => recorder.waitForIdle(),
    setPersonState: (state: string) => {
      personState = state;
    },
  };
};

let cleanupDirs: string[] = [];
let originalSampleDir = "";

beforeEach(() => {
  cleanupDirs = [];
  originalSampleDir = process.env.GOING_HOME_SAMPLE_DIR ?? "";
});

afterEach(() => {
  for (const dir of cleanupDirs) {
    rmSync(dir, { force: true, recursive: true });
  }
  process.env.GOING_HOME_SAMPLE_DIR = originalSampleDir;
});

test("writes header once and appends startup + manual rows", async () => {
  const harness = createHarness({
    sample: {
      timestamp: 1,
      distanceFromHome: 100,
      speedInMetersPerSecond30s: 1,
      speedInMetersPerSecond2m: 1,
      speedInMetersPerSecond10m: 1,
      distanceDelta2m: -5,
      distanceDelta10m: -10,
      rollingSpeedStd10m: 0.1,
      zoneOneHotHome: 0,
      zoneOneHotNotHome: 1,
      zoneOneHotWork: 0,
      zoneOneHotGym: 0,
      cameFromWork: 0,
      cameFromGym: 0,
      movingTowardHome: 1,
      accelerationMetersPerSecondSquared: 0,
      etaToHomeSeconds: 1200,
      isWeekend: 0,
      hourOfDaySin: 0,
      hourOfDayCos: 1,
      dayOfWeekSin: 0,
      dayOfWeekCos: 1,
      speedHistoryPointCount: 3,
      speedInMetersPerSecond: 1,
    },
  });
  cleanupDirs.push(harness.sampleDir);

  await harness.runReady();
  await harness.recorder.recordNow("manual", true);

  const lines = harness.lines();
  expect(lines.length).toBe(4);
  expect(lines[0].startsWith("sample_id,timestamp_utc,trigger_reason")).toBe(true);
});

test("skips writes when under min interval and no meaningful change", async () => {
  const harness = createHarness({
    sample: {
      timestamp: 1,
      distanceFromHome: 100,
      speedInMetersPerSecond30s: 1,
      speedInMetersPerSecond2m: 1,
      speedInMetersPerSecond10m: 1,
      distanceDelta2m: -5,
      distanceDelta10m: -10,
      rollingSpeedStd10m: 0.1,
      zoneOneHotHome: 0,
      zoneOneHotNotHome: 1,
      zoneOneHotWork: 0,
      zoneOneHotGym: 0,
      cameFromWork: 0,
      cameFromGym: 0,
      movingTowardHome: 1,
      accelerationMetersPerSecondSquared: 0,
      etaToHomeSeconds: 1200,
      isWeekend: 0,
      hourOfDaySin: 0,
      hourOfDayCos: 1,
      dayOfWeekSin: 0,
      dayOfWeekCos: 1,
      speedHistoryPointCount: 3,
      speedInMetersPerSecond: 1,
    },
  });
  cleanupDirs.push(harness.sampleDir);

  await harness.runReady();
  const before = harness.lines().length;
  await harness.recorder.recordNow("distance_update", false);

  expect(harness.lines().length).toBe(before);
});

test("force writes append even within min interval", async () => {
  const sample = {
    timestamp: 1,
    distanceFromHome: 100,
    speedInMetersPerSecond30s: 1,
    speedInMetersPerSecond2m: 1,
    speedInMetersPerSecond10m: 1,
    distanceDelta2m: -5,
    distanceDelta10m: -10,
    rollingSpeedStd10m: 0.1,
    zoneOneHotHome: 0,
    zoneOneHotNotHome: 1,
    zoneOneHotWork: 0,
    zoneOneHotGym: 0,
    cameFromWork: 0,
    cameFromGym: 0,
    movingTowardHome: 1,
    accelerationMetersPerSecondSquared: 0,
    etaToHomeSeconds: 1200,
    isWeekend: 0,
    hourOfDaySin: 0,
    hourOfDayCos: 1,
    dayOfWeekSin: 0,
    dayOfWeekCos: 1,
    speedHistoryPointCount: 3,
    speedInMetersPerSecond: 1,
  };
  const harness = createHarness({ sample });
  cleanupDirs.push(harness.sampleDir);

  await harness.runReady();
  const before = harness.lines().length;
  sample.zoneOneHotWork = 1;
  sample.zoneOneHotNotHome = 0;
  await harness.recorder.recordNow("person_zone_change", true);

  expect(harness.lines().length).toBe(before + 1);
});
