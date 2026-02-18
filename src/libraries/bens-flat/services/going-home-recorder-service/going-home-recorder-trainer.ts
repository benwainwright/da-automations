import { randomUUID } from "node:crypto";
import type { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

const SAMPLE_MIN_INTERVAL_SECONDS = 20;
const SAMPLE_FORCE_INTERVAL_SECONDS = 120;
const SAMPLE_MIN_DISTANCE_DELTA_METERS = 5;
const SAMPLE_MIN_SPEED_DELTA_MPS = 0.25;

type DistancePoint = {
  distance: number;
  timestamp: number;
};

type CalendarFeatures = {
  hasEventNow: number;
  minutesUntilNextEventStart: number;
  minutesUntilCurrentEventEnd: number;
  currentEventDurationMinutes: number;
  nextEventDurationMinutes: number;
  busyMinutesNext60m: number;
  busyMinutesNext120m: number;
  freeBlockMinutesBeforeNextEvent: number;
  eventCountNext2h: number;
  hasBackToBackEventsNext2h: number;
  calendarBusyRatioNext2h: number;
  hasAllDayEventToday: number;
  isWorkHoursCalendarBusy: number;
};

type CalendarInterval = {
  startMs: number;
  endMs: number;
  isAllDay: boolean;
};

export interface GoingHomeRecorderSample {
  sample_id: string;
  timestamp_utc: string;
  trigger_reason: string;
  timestamp: number;
  distanceFromHome: number;
  speedInMetersPerSecond30s: number;
  speedInMetersPerSecond2m: number;
  speedInMetersPerSecond10m: number;
  distanceDelta2m: number;
  distanceDelta10m: number;
  rollingSpeedStd10m: number;
  zoneOneHotHome: number;
  zoneOneHotNotHome: number;
  zoneOneHotWork: number;
  zoneOneHotGym: number;
  cameFromWork: number;
  cameFromGym: number;
  movingTowardHome: number;
  accelerationMetersPerSecondSquared: number;
  isWeekend: number;
  hourOfDaySin: number;
  hourOfDayCos: number;
  dayOfWeekSin: number;
  dayOfWeekCos: number;
  speedHistoryPointCount: number;
  speedInMetersPerSecond: number;
  hasEventNow: number;
  minutesUntilNextEventStart: number;
  minutesUntilCurrentEventEnd: number;
  currentEventDurationMinutes: number;
  nextEventDurationMinutes: number;
  busyMinutesNext60m: number;
  busyMinutesNext120m: number;
  freeBlockMinutesBeforeNextEvent: number;
  eventCountNext2h: number;
  hasBackToBackEventsNext2h: number;
  calendarBusyRatioNext2h: number;
  hasAllDayEventToday: number;
  isWorkHoursCalendarBusy: number;
}

export class GoingHomeRecorderTrainer {
  private lastSample: GoingHomeRecorderSample | undefined;
  private pendingSample: GoingHomeRecorderSample | undefined;
  private previousZone = "";

  public constructor(private readonly hass: TServiceParams["hass"]) {}

  public watchedEntities(): PICK_ENTITY[] {
    return [
      "sensor.home_proximity_ben_distance",
      "sensor.home_proximity_ben_direction_of_travel",
      "person.ben",
    ];
  }

  public async createSample(reason: string): Promise<GoingHomeRecorderSample> {
    const sample =
      this.pendingSample?.trigger_reason === reason
        ? this.pendingSample
        : await this.buildSample(reason);
    this.pendingSample = undefined;
    this.lastSample = sample;
    return sample;
  }

  public async shouldSample(reason: string, lastWrittenAt: number): Promise<boolean> {
    const sample = await this.buildSample(reason);
    this.pendingSample = sample;

    if (!this.lastSample) {
      return true;
    }

    const zoneChanged =
      sample.zoneOneHotHome !== this.lastSample.zoneOneHotHome ||
      sample.zoneOneHotNotHome !== this.lastSample.zoneOneHotNotHome ||
      sample.zoneOneHotWork !== this.lastSample.zoneOneHotWork ||
      sample.zoneOneHotGym !== this.lastSample.zoneOneHotGym;
    const elapsedSeconds = (Date.now() - lastWrittenAt) / 1000;
    if (elapsedSeconds >= SAMPLE_FORCE_INTERVAL_SECONDS) {
      return true;
    }

    if (reason === "person.ben" && zoneChanged) {
      return true;
    }

    if (reason === "heartbeat") {
      if (elapsedSeconds < SAMPLE_MIN_INTERVAL_SECONDS) {
        return false;
      }
      return this.hasMeaningfulChange(sample, zoneChanged);
    }

    if (elapsedSeconds < SAMPLE_MIN_INTERVAL_SECONDS) {
      return false;
    }

    return this.hasMeaningfulChange(sample, zoneChanged);
  }

  private async buildSample(reason: string): Promise<GoingHomeRecorderSample> {
    const payload = await this.getSample(reason);
    const now = new Date();
    return {
      sample_id: randomUUID(),
      timestamp_utc: now.toISOString(),
      ...payload,
    };
  }

  private hasMeaningfulChange(sample: GoingHomeRecorderSample, zoneChanged: boolean) {
    if (!this.lastSample) {
      return true;
    }

    const distanceDelta = Math.abs(sample.distanceFromHome - this.lastSample.distanceFromHome);
    const speedDelta = Math.abs(
      sample.speedInMetersPerSecond - this.lastSample.speedInMetersPerSecond,
    );
    const movingTowardHomeChanged = sample.movingTowardHome !== this.lastSample.movingTowardHome;

    return (
      distanceDelta >= SAMPLE_MIN_DISTANCE_DELTA_METERS ||
      speedDelta >= SAMPLE_MIN_SPEED_DELTA_MPS ||
      movingTowardHomeChanged ||
      zoneChanged
    );
  }

  public markSaved(sample: GoingHomeRecorderSample) {
    this.lastSample = sample;
  }

  private async getSample(reason: string) {
    const now = new Date();
    const nowTs = Date.now();
    const person = this.hass.refBy.id("person.ben");
    const distance = this.hass.refBy.id("sensor.home_proximity_ben_distance");
    const distanceFromHome = this.toNumber(distance.state);

    const rawStates = await distance.history(new Date(nowTs - 1000 * 600), new Date(nowTs));
    const points = this.toDistancePoints(rawStates);
    const points30s = this.pointsForWindow(points, 30, nowTs);
    const points2m = this.pointsForWindow(points, 120, nowTs);
    const points10m = this.pointsForWindow(points, 600, nowTs);

    const speed30s = this.getSpeedFromPoints(points30s);
    const speed2m = this.getSpeedFromPoints(points2m);
    const speed10m = this.getSpeedFromPoints(points10m);
    const delta2m = this.getDistanceDeltaFromPoints(points2m);
    const delta10m = this.getDistanceDeltaFromPoints(points10m);
    const rollingSpeedStd10m = this.getRollingSpeedStdFromPoints(points10m);

    const personZone = String(person.state ?? "");
    const zoneOneHotHome = Number(personZone === "home");
    const zoneOneHotNotHome = Number(personZone === "not_home");
    const zoneOneHotWork = Number(personZone === "work");
    const zoneOneHotGym = Number(personZone === "gym");
    const cameFromWork = Number(this.previousZone === "work" && personZone !== "work");
    const cameFromGym = Number(this.previousZone === "gym" && personZone !== "gym");
    this.previousZone = personZone;

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
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = Number(day === 0 || day === 6);
    const hourOfDaySin = Math.sin((2 * Math.PI * hour) / 24);
    const hourOfDayCos = Math.cos((2 * Math.PI * hour) / 24);
    const dayOfWeekSin = Math.sin((2 * Math.PI * day) / 7);
    const dayOfWeekCos = Math.cos((2 * Math.PI * day) / 7);
    const calendar = await this.getCalendarFeatures(now);

    return {
      trigger_reason: reason,
      timestamp: nowTs,
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
      isWeekend,
      hourOfDaySin,
      hourOfDayCos,
      dayOfWeekSin,
      dayOfWeekCos,
      speedHistoryPointCount: availableSpeeds.length,
      speedInMetersPerSecond,
      hasEventNow: calendar.hasEventNow,
      minutesUntilNextEventStart: calendar.minutesUntilNextEventStart,
      minutesUntilCurrentEventEnd: calendar.minutesUntilCurrentEventEnd,
      currentEventDurationMinutes: calendar.currentEventDurationMinutes,
      nextEventDurationMinutes: calendar.nextEventDurationMinutes,
      busyMinutesNext60m: calendar.busyMinutesNext60m,
      busyMinutesNext120m: calendar.busyMinutesNext120m,
      freeBlockMinutesBeforeNextEvent: calendar.freeBlockMinutesBeforeNextEvent,
      eventCountNext2h: calendar.eventCountNext2h,
      hasBackToBackEventsNext2h: calendar.hasBackToBackEventsNext2h,
      calendarBusyRatioNext2h: calendar.calendarBusyRatioNext2h,
      hasAllDayEventToday: calendar.hasAllDayEventToday,
      isWorkHoursCalendarBusy: calendar.isWorkHoursCalendarBusy,
    };
  }

  private async getCalendarFeatures(now: Date): Promise<CalendarFeatures> {
    try {
      const raw = await (
        this.hass.call.calendar.get_events as (service_data: {
          entity_id: string;
          start_date_time: string;
          end_date_time: string;
        }) => Promise<unknown>
      )({
        entity_id: "calendar.personal_calendar",
        start_date_time: now.toISOString(),
        end_date_time: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      const intervals = this.extractCalendarIntervals(raw);
      const nowMs = now.getTime();
      const horizon60 = nowMs + 60 * 60 * 1000;
      const horizon120 = nowMs + 120 * 60 * 1000;
      const futureIntervals = intervals
        .filter((interval) => interval.startMs > nowMs)
        .sort((a, b) => a.startMs - b.startMs);
      const activeIntervals = intervals.filter(
        (interval) => interval.startMs <= nowMs && interval.endMs > nowMs,
      );

      const nextInterval = futureIntervals[0];
      const hasEventNow = Number(activeIntervals.length > 0);
      const minutesUntilNextEventStart = nextInterval
        ? this.msToMinutes(nextInterval.startMs - nowMs)
        : 720;
      const minutesUntilCurrentEventEnd =
        activeIntervals.length === 0
          ? 0
          : this.msToMinutes(
              Math.min(...activeIntervals.map((interval) => interval.endMs)) - nowMs,
            );
      const currentEventDurationMinutes =
        activeIntervals.length === 0
          ? 0
          : this.msToMinutes(
              Math.max(...activeIntervals.map((interval) => interval.endMs - interval.startMs)),
            );
      const nextEventDurationMinutes = nextInterval
        ? this.msToMinutes(nextInterval.endMs - nextInterval.startMs)
        : 0;

      const busyMinutesNext60m = this.getBusyMinutesInRange(intervals, nowMs, horizon60);
      const busyMinutesNext120m = this.getBusyMinutesInRange(intervals, nowMs, horizon120);
      const freeBlockMinutesBeforeNextEvent = hasEventNow ? 0 : minutesUntilNextEventStart;
      const eventCountNext2h = intervals.filter(
        (interval) => interval.endMs > nowMs && interval.startMs < horizon120,
      ).length;
      const hasBackToBackEventsNext2h = Number(
        futureIntervals.some((interval, index) => {
          if (interval.startMs >= horizon120 || index === 0) {
            return false;
          }
          const previous = futureIntervals[index - 1];
          return previous.endMs >= interval.startMs;
        }),
      );
      const calendarBusyRatioNext2h = Math.min(1, busyMinutesNext120m / 120);
      const hasAllDayEventToday = Number(this.hasAllDayEventOverlappingToday(intervals, now));
      const workStart = new Date(now);
      workStart.setHours(9, 0, 0, 0);
      const workEnd = new Date(now);
      workEnd.setHours(17, 0, 0, 0);
      const isWorkHoursCalendarBusy = Number(
        this.getBusyMinutesInRange(intervals, workStart.getTime(), workEnd.getTime()) > 0,
      );

      return {
        hasEventNow,
        minutesUntilNextEventStart,
        minutesUntilCurrentEventEnd,
        currentEventDurationMinutes,
        nextEventDurationMinutes,
        busyMinutesNext60m,
        busyMinutesNext120m,
        freeBlockMinutesBeforeNextEvent,
        eventCountNext2h,
        hasBackToBackEventsNext2h,
        calendarBusyRatioNext2h,
        hasAllDayEventToday,
        isWorkHoursCalendarBusy,
      };
    } catch {
      return {
        hasEventNow: 0,
        minutesUntilNextEventStart: 720,
        minutesUntilCurrentEventEnd: 0,
        currentEventDurationMinutes: 0,
        nextEventDurationMinutes: 0,
        busyMinutesNext60m: 0,
        busyMinutesNext120m: 0,
        freeBlockMinutesBeforeNextEvent: 720,
        eventCountNext2h: 0,
        hasBackToBackEventsNext2h: 0,
        calendarBusyRatioNext2h: 0,
        hasAllDayEventToday: 0,
        isWorkHoursCalendarBusy: 0,
      };
    }
  }

  private extractCalendarIntervals(raw: unknown): CalendarInterval[] {
    const calendars = Object.values((raw ?? {}) as Record<string, { events?: unknown[] }>);
    const events = calendars.flatMap((calendar) => calendar?.events ?? []);

    return events
      .map((event) => {
        const start = (event as { start?: unknown })?.start;
        const end = (event as { end?: unknown })?.end;
        const startDate = typeof start === "string" ? new Date(start) : null;
        const endDate = typeof end === "string" ? new Date(end) : null;
        if (!startDate || !endDate) {
          return null;
        }
        const startMs = startDate.getTime();
        const endMs = endDate.getTime();
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
          return null;
        }
        return {
          startMs,
          endMs,
          isAllDay:
            typeof start === "string" &&
            typeof end === "string" &&
            !start.includes("T") &&
            !end.includes("T"),
        };
      })
      .filter((interval): interval is CalendarInterval => interval !== null)
      .sort((a, b) => a.startMs - b.startMs);
  }

  private getBusyMinutesInRange(
    intervals: CalendarInterval[],
    windowStart: number,
    windowEnd: number,
  ) {
    if (windowEnd <= windowStart) {
      return 0;
    }

    const clipped = intervals
      .map((interval) => ({
        startMs: Math.max(interval.startMs, windowStart),
        endMs: Math.min(interval.endMs, windowEnd),
      }))
      .filter((interval) => interval.endMs > interval.startMs)
      .sort((a, b) => a.startMs - b.startMs);

    if (clipped.length === 0) {
      return 0;
    }

    let totalMs = 0;
    let current = clipped[0];
    for (let i = 1; i < clipped.length; i++) {
      const next = clipped[i];
      if (next.startMs <= current.endMs) {
        current.endMs = Math.max(current.endMs, next.endMs);
        continue;
      }
      totalMs += current.endMs - current.startMs;
      current = next;
    }
    totalMs += current.endMs - current.startMs;
    return this.msToMinutes(totalMs);
  }

  private hasAllDayEventOverlappingToday(intervals: CalendarInterval[], now: Date) {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const startMs = todayStart.getTime();
    const endMs = todayEnd.getTime();
    return intervals.some(
      (interval) => interval.isAllDay && interval.endMs > startMs && interval.startMs <= endMs,
    );
  }

  private msToMinutes(ms: number) {
    return Math.max(0, Math.round(ms / 60000));
  }

  private toFiniteTimestamp(value: unknown) {
    const timestamp = Number((value as { valueOf?: () => unknown })?.valueOf?.() ?? value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  private toDistancePoints(states: { state: unknown; last_reported: unknown }[]) {
    return states
      .map((state) => {
        const distance = Number(state.state);
        const timestamp = this.toFiniteTimestamp(state.last_reported);
        if (!Number.isFinite(distance) || timestamp === null) {
          return null;
        }
        return { distance, timestamp };
      })
      .filter((point): point is DistancePoint => point !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private pointsForWindow(points: DistancePoint[], windowSeconds: number, nowTs: number) {
    const cutoff = nowTs - windowSeconds * 1000;
    return points.filter((point) => point.timestamp >= cutoff);
  }

  private getSpeedFromPoints(points: DistancePoint[]) {
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
  }

  private getDistanceDeltaFromPoints(points: DistancePoint[]) {
    if (points.length < 2) {
      return null;
    }
    const [first] = points;
    const [last] = points.toReversed();
    return last.distance - first.distance;
  }

  private getRollingSpeedStdFromPoints(points: DistancePoint[]) {
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
  }

  private toNumber(value: unknown) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
}
