import { expect, mock, test } from "bun:test";
import { GoingHomeRecorderService } from "./going-home-recorder-service.ts";
import {
  GoingHomeRecorderSample,
  GoingHomeRecorderTrainer,
} from "./going-home-recorder-trainer.ts";

test("registers going-home trainer with learning sensor service", () => {
  const makeSensor = mock((_name: string, _trainer: unknown, _interval: string) => {});
  GoingHomeRecorderService({
    hass: { refBy: { id: () => ({ onUpdate: () => {} }) } },
    learning_sensors: { sensor: { makeSensor } },
  } as any);

  expect(makeSensor).toHaveBeenCalledTimes(1);
  expect((makeSensor as any).mock.calls[0]?.[0]).toBe("going-home");
  expect((makeSensor as any).mock.calls[0]?.[2]).toBe("5m");
});

test("shouldSample uses reason + lastWrittenAt for zone change and throttling", async () => {
  const trainer = new GoingHomeRecorderTrainer({ refBy: { id: () => ({}) } } as any);
  const anyTrainer = trainer as any;

  const base: GoingHomeRecorderSample = {
    sample_id: "1",
    timestamp_utc: "2026-01-01T00:00:00.000Z",
    trigger_reason: "sensor.home_proximity_ben_distance",
    timestamp: Date.now(),
    distanceFromHome: 1000,
    speedInMetersPerSecond30s: 0,
    speedInMetersPerSecond2m: 0,
    speedInMetersPerSecond10m: 0,
    distanceDelta2m: 0,
    distanceDelta10m: 0,
    rollingSpeedStd10m: 0,
    zoneOneHotHome: 0,
    zoneOneHotNotHome: 1,
    zoneOneHotWork: 0,
    zoneOneHotGym: 0,
    cameFromWork: 0,
    cameFromGym: 0,
    movingTowardHome: 0,
    accelerationMetersPerSecondSquared: 0,
    etaToHomeSeconds: 0,
    isWeekend: 0,
    hourOfDaySin: 0,
    hourOfDayCos: 1,
    dayOfWeekSin: 0,
    dayOfWeekCos: 1,
    speedHistoryPointCount: 1,
    speedInMetersPerSecond: 0,
    hasEventNow: 0,
    minutesUntilNextEventStart: 0,
    minutesUntilCurrentEventEnd: 0,
    currentEventDurationMinutes: 0,
    nextEventDurationMinutes: 0,
    busyMinutesNext60m: 0,
    busyMinutesNext120m: 0,
    freeBlockMinutesBeforeNextEvent: 0,
    eventCountNext2h: 0,
    hasBackToBackEventsNext2h: 0,
    calendarBusyRatioNext2h: 0,
    hasAllDayEventToday: 0,
    isWorkHoursCalendarBusy: 0,
  };

  anyTrainer.lastSample = base;

  const soon = Date.now();
  anyTrainer.buildSample = async () => ({ ...base });
  expect(await trainer.shouldSample("sensor.home_proximity_ben_distance", soon)).toBe(false);

  anyTrainer.buildSample = async () => ({ ...base, zoneOneHotNotHome: 0, zoneOneHotWork: 1 });
  expect(await trainer.shouldSample("person.ben", soon)).toBe(true);
});
