import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { GoingHomeRecorderService } from "./going-home-recorder-service.ts";

const waitFor = async (condition: () => boolean, timeoutMs = 1000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("waitFor timeout");
};

type Callbacks = {
  onDistanceUpdate?: () => void;
  onDirectionUpdate?: () => void;
  onPersonUpdate?: (newState: { state: string }, oldState: { state: string }) => void;
  onReady?: () => void;
  onInterval?: () => void;
};

type RecorderApi = {
  waitForIdle: () => Promise<void>;
};

const createHarness = ({
  sample,
  minIntervalSeconds = 20,
}: {
  sample: Record<string, unknown>;
  minIntervalSeconds?: number;
}) => {
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
      bens_flat: {
        GOING_HOME_SAMPLE_MIN_INTERVAL_SECONDS: minIntervalSeconds,
      },
    },
    hass: {
      refBy: {
        id: (entityId: string) => {
          if (entityId === "sensor.home_proximity_ben_distance") {
            return {
              onUpdate: (callback: () => void) => {
                callbacks.onDistanceUpdate = callback;
              },
            };
          }
          if (entityId === "sensor.home_proximity_ben_direction_of_travel") {
            return {
              onUpdate: (callback: () => void) => {
                callbacks.onDirectionUpdate = callback;
              },
            };
          }
          if (entityId === "person.ben") {
            return {
              get state() {
                return personState;
              },
              onUpdate: (
                callback: (newState: { state: string }, oldState: { state: string }) => void,
              ) => {
                callbacks.onPersonUpdate = callback;
              },
            };
          }
          return {};
        },
      },
    },
    lifecycle: {
      onReady: (callback: () => void) => {
        callbacks.onReady = callback;
      },
    },
    logger: {
      error: mock(() => {}),
    },
    scheduler: {
      setInterval: (callback: () => void) => {
        callbacks.onInterval = callback;
      },
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
    await waitFor(() => lines().length >= 2);
  };

  return {
    callbacks,
    lines,
    runReady,
    sampleDir,
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
  harness.setPersonState("work");
  harness.callbacks.onPersonUpdate?.({ state: "work" }, { state: "not_home" });
  await harness.flush();
  await waitFor(() => harness.lines().length >= 3);

  const lines = harness.lines();
  expect(lines.length).toBe(3);
  expect(lines[0].startsWith("sample_id,timestamp_utc,trigger_reason")).toBe(true);
});

test("skips writes when under min interval and no meaningful change", async () => {
  const harness = createHarness({
    minIntervalSeconds: 300,
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
  harness.callbacks.onDistanceUpdate?.();
  await harness.flush();

  expect(harness.lines().length).toBe(before);
});

test("forces write on person zone change even within min interval", async () => {
  const harness = createHarness({
    minIntervalSeconds: 300,
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
  harness.setPersonState("work");
  harness.callbacks.onPersonUpdate?.({ state: "work" }, { state: "not_home" });
  await harness.flush();

  await waitFor(() => harness.lines().length > before);
  expect(harness.lines().length).toBe(before + 1);
});
