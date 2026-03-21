import { ApiClient } from "./client.ts";
import {
  Action,
  DeviceType,
  INukiClient,
  LogResponse,
  NotificationResponse,
  OpenerSource,
  Smartlock,
  State,
  Trigger,
} from "./i-client.ts";

interface RawLog {
  id: string;
  smartlockId: number;
  deviceType: number;
  accountUserId: number;
  authId: string;
  name: string;
  action: number;
  trigger: number;
  state: number;
  autoUnlock: boolean;
  date: string;
  openerLog?: {
    activeCm: boolean;
    activeRto: boolean;
    source: number;
    flagGeoFence: boolean;
    flagForce: boolean;
    flagDoorbellSuppression: boolean;
  };
  ajarTimeout: number;
  source: number;
  error: string;
}

const deviceTypeMap = {
  0: "SMARTLOCK",
  1: "BOX",
  2: "OPENER",
  /* cspell:disable-next-line */
  3: "SMARTDOOR",
  4: "SMARTLOCK_3_4",
  5: "SMARTLOCK_5",
} as const satisfies Record<number, Exclude<DeviceType, "UNKNOWN">>;

const actionMap = {
  1: "UNLOCK",
  2: "LOCK",
  3: "UNLATCH",
  4: "LOCK_N_GO",
  5: "LOCK_N_GO_WITH_UNLATCH",
  208: "DOOR_WARNING_AJAR",
  209: "DOOR_WARNING_STATUS_MISMATCH",
  224: "DOORBELL_RECOGNITION",
  240: "DOOR_OPENED",
  241: "DOOR_CLOSED",
  242: "DOOR_SENSOR_JAMMED",
  243: "FIRMWARE_UPDATE",
  250: "DOOR_LOG_ENABLED",
  251: "DOOR_LOG_DISABLED",
  252: "INITIALIZATION",
  253: "CALIBRATION",
  254: "LOG_ENABLED",
  255: "LOG_DISABLED",
} as const satisfies Record<number, Exclude<Action, "UNKNOWN">>;

const triggerMap = {
  0: "SYSTEM",
  1: "MANUAL",
  2: "BUTTON",
  3: "AUTOMATIC",
  4: "WEB",
  5: "APP",
  6: "AUTO_LOCK",
  7: "ACCESSORY",
  255: "KEYPAD",
} as const satisfies Record<number, Exclude<Trigger, "UNKNOWN">>;

const stateMap = {
  0: "SUCCESS",
  1: "MOTOR_BLOCKED",
  2: "CANCELED",
  3: "TOO_RECENT",
  4: "BUSY",
  5: "LOW_MOTOR_VOLTAGE",
  6: "CLUTCH_FAILURE",
  7: "MOTOR_POWER_FAILURE",
  8: "INCOMPLETE",
  9: "REJECTED",
  10: "REJECTED_NIGHT_MODE",
  254: "OTHER_ERROR",
  255: "UNKNOWN_ERROR",
} as const satisfies Record<number, Exclude<State, "UNKNOWN">>;

const openerSourceMap = {
  0: "DOORBELL",
  /* cspell:disable-next-line */
  1: "TIMECONTROL",
  2: "APP",
  3: "BUTTON",
  4: "FOB",
  5: "BRIDGE",
  6: "KEYPAD",
} as const satisfies Record<number, Exclude<OpenerSource, "UNKNOWN">>;

const mapValue = <T extends string>(map: Record<number, T>, value: number, fallback: T): T => {
  return map[value] ?? fallback;
};

export class NukiApi implements INukiClient {
  public constructor(private client: ApiClient) {}

  public async getNotifications(): Promise<NotificationResponse[]> {
    return await this.client.get<NotificationResponse[]>("notification");
  }

  public async getSmartlocks(): Promise<Smartlock[]> {
    return await this.client.get<Smartlock[]>("smartlock");
  }

  public async getSmartlockLogs(lockId: number, fromDate?: Date): Promise<LogResponse[]> {
    const params = fromDate ? { fromDate: fromDate.toISOString() } : undefined;
    const raw = await this.client.get<RawLog[]>(`smartlock/${lockId}/log`, params);

    return raw.map((log) => ({
      feature: "DEVICE_LOGS",
      smartlockId: log.smartlockId,
      deviceType: mapValue(deviceTypeMap, log.deviceType, "UNKNOWN"),
      name: log.name,
      action: mapValue(actionMap, log.action, "UNKNOWN"),
      trigger: mapValue(triggerMap, log.trigger, "UNKNOWN"),
      state: mapValue(stateMap, log.state, "UNKNOWN"),
      autoUnlock: log.autoUnlock,
      date: log.date,
      openerLog: log.openerLog
        ? {
            activeCm: log.openerLog.activeCm,
            activeRto: log.openerLog.activeRto,
            source: mapValue(openerSourceMap, log.openerLog.source, "UNKNOWN"),
            flagGeoFence: log.openerLog.flagGeoFence,
            flagForce: log.openerLog.flagForce,
            flagDoorbellSuppression: log.openerLog.flagDoorbellSuppression,
          }
        : undefined,
    }));
  }
}
