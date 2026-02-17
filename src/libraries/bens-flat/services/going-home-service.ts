import { TServiceParams } from "@digital-alchemy/core";

export function GoingHomeService({ hass }: TServiceParams) {
  type DistancePoint = {
    distance: number;
    timestamp: number;
  };
  let previousZone = "";

  const toFiniteTimestamp = (value: unknown) => {
    const timestamp = Number((value as { valueOf?: () => unknown })?.valueOf?.() ?? value);
    return Number.isFinite(timestamp) ? timestamp : null;
  };

  const toDistancePoints = (states: { state: unknown; last_reported: unknown }[]) =>
    states
      .map((state) => {
        const distance = Number(state.state);
        const timestamp = toFiniteTimestamp(state.last_reported);
        if (!Number.isFinite(distance) || timestamp === null) {
          return null;
        }
        return { distance, timestamp };
      })
      .filter((point): point is DistancePoint => point !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

  const pointsForWindow = (points: DistancePoint[], windowSeconds: number, nowTs: number) => {
    const cutoff = nowTs - windowSeconds * 1000;
    return points.filter((point) => point.timestamp >= cutoff);
  };

  const getSpeedFromPoints = (points: DistancePoint[]) => {
    if (points.length < 2) {
      return null;
    }

    const [first] = points;
    const [last] = points.toReversed();

    const timeDifferenceInSeconds = (last.timestamp - first.timestamp) / 1000;
    if (!Number.isFinite(timeDifferenceInSeconds) || timeDifferenceInSeconds <= 0) {
      return null;
    }

    const distanceTravelled = Math.abs(first.distance - last.distance);

    return distanceTravelled / timeDifferenceInSeconds;
  };

  const getDistanceDeltaFromPoints = (points: DistancePoint[]) => {
    if (points.length < 2) {
      return null;
    }

    const [first] = points;
    const [last] = points.toReversed();

    return last.distance - first.distance;
  };

  const getRollingSpeedStdFromPoints = (points: DistancePoint[]) => {
    if (points.length < 3) {
      return 0;
    }

    const speeds: number[] = [];

    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const current = points[i];

      const seconds = (current.timestamp - previous.timestamp) / 1000;
      if (!Number.isFinite(seconds) || seconds <= 0) {
        continue;
      }

      const speed = Math.abs(current.distance - previous.distance) / seconds;
      if (Number.isFinite(speed)) {
        speeds.push(speed);
      }
    }

    if (speeds.length < 2) {
      return 0;
    }

    const mean = speeds.reduce((sum, value) => sum + value, 0) / speeds.length;
    const variance = speeds.reduce((sum, value) => sum + (value - mean) ** 2, 0) / speeds.length;

    return Math.sqrt(variance);
  };

  const getSample = async () => {
    const now = new Date();
    const person = hass.refBy.id("person.ben");

    const distance = hass.refBy.id("sensor.home_proximity_ben_distance");
    const { state: distanceFromHome } = distance;
    const nowTs = Date.now();
    const rawStates = await distance.history(new Date(nowTs - 1000 * 600), new Date(nowTs));
    const points = toDistancePoints(rawStates);
    const points30s = pointsForWindow(points, 30, nowTs);
    const points2m = pointsForWindow(points, 120, nowTs);
    const points10m = pointsForWindow(points, 600, nowTs);

    const speed30s = getSpeedFromPoints(points30s);
    const speed2m = getSpeedFromPoints(points2m);
    const speed10m = getSpeedFromPoints(points10m);
    const delta2m = getDistanceDeltaFromPoints(points2m);
    const delta10m = getDistanceDeltaFromPoints(points10m);
    const rollingSpeedStd10m = getRollingSpeedStdFromPoints(points10m);

    const personZone = String(person.state ?? "");
    const zoneOneHotHome = Number(personZone === "home");
    const zoneOneHotNotHome = Number(personZone === "not_home");
    const zoneOneHotWork = Number(personZone === "work");
    const zoneOneHotGym = Number(personZone === "gym");
    const cameFromWork = Number(previousZone === "work" && personZone !== "work");
    const cameFromGym = Number(previousZone === "gym" && personZone !== "gym");
    previousZone = personZone;

    const availableSpeeds = [speed30s, speed2m, speed10m].filter(
      (speed) => typeof speed === "number",
    ) as number[];

    const speedInMetersPerSecond =
      availableSpeeds.length === 0
        ? 0
        : availableSpeeds.reduce((sum, speed) => sum + speed, 0) / availableSpeeds.length;

    const movingTowardHome = Number((delta10m ?? 0) < 0);
    const accelerationMetersPerSecondSquared =
      speed30s !== null && speed2m !== null ? (speed30s - speed2m) / 90 : 0;

    const distanceFromHomeNumber = Number(distanceFromHome);
    const safeDistanceFromHome = Number.isFinite(distanceFromHomeNumber)
      ? distanceFromHomeNumber
      : 0;

    const etaToHomeSeconds =
      safeDistanceFromHome > 0 && speedInMetersPerSecond > 0 && movingTowardHome
        ? safeDistanceFromHome / speedInMetersPerSecond
        : 0;

    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = Number(day === 0 || day === 6);
    const hourOfDaySin = Math.sin((2 * Math.PI * hour) / 24);
    const hourOfDayCos = Math.cos((2 * Math.PI * hour) / 24);
    const dayOfWeekSin = Math.sin((2 * Math.PI * day) / 7);
    const dayOfWeekCos = Math.cos((2 * Math.PI * day) / 7);

    return {
      timestamp: Date.now(),
      distanceFromHome,
      speedInMetersPerSecond30s: speed30s ?? 0,
      speedInMetersPerSecond2m: speed2m ?? 0,
      speedInMetersPerSecond10m: speed10m ?? 0,
      distanceDelta2m: delta2m ?? 0,
      distanceDelta10m: delta10m ?? 0,
      rollingSpeedStd10m: rollingSpeedStd10m ?? 0,
      zoneOneHotHome,
      zoneOneHotNotHome,
      zoneOneHotWork,
      zoneOneHotGym,
      cameFromWork,
      cameFromGym,
      movingTowardHome,
      accelerationMetersPerSecondSquared,
      etaToHomeSeconds,
      isWeekend,
      hourOfDaySin,
      hourOfDayCos,
      dayOfWeekSin,
      dayOfWeekCos,
      speedHistoryPointCount: availableSpeeds.length,
      speedInMetersPerSecond,
    };
  };
  return { getSample };
}
