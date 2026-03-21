export interface NotificationResponse {
  notificationId: string;
  referenceId: string;
  pushId: string;
  secret: string;
  os: number;
  language: string;
  status: number;
  lastActiveDate: string;
  settings: {
    smartlockId: number;
    triggerEvents: string[];
    authIds: string[];
  }[];
}

export interface Smartlock {
  smartlockId: number;
  accountId: number;
  type: number;
  lmType: number;
  authId: number;
  name: string;
  favorite: boolean;
  config: {
    name: string;
    latitude: number;
    longitude: number;
    capabilities: number;
    autoUnlatch: boolean;
    liftUpHandle: boolean;
    pairingEnabled: boolean;
    buttonEnabled: boolean;
    ledEnabled: boolean;
    ledBrightness: number;
    timezoneOffset: number;
    daylightSavingMode: number;
    fobPaired: boolean;
    fobAction1: number;
    fobAction2: number;
    fobAction3: number;
    singleLock: boolean;
    operatingMode: number;
    advertisingMode: number;
    keypadPaired: boolean;
    keypad2Paired: boolean;
    homekitState: number;
    matterState: number;
    timezoneId: number;
    deviceType: number;
    wifiEnabled: boolean;
    operationId: string;
    productVariant: number;
  };
}

export type DeviceType =
  | "SMARTLOCK"
  | "BOX"
  | "OPENER"
  /* cspell:disable-next-line */
  | "SMARTDOOR"
  | "SMARTLOCK_3_4"
  | "SMARTLOCK_5"
  | "UNKNOWN";

export type Action =
  | "UNLOCK"
  | "LOCK"
  | "UNLATCH"
  | "LOCK_N_GO"
  | "LOCK_N_GO_WITH_UNLATCH"
  | "DOOR_WARNING_AJAR"
  | "DOOR_WARNING_STATUS_MISMATCH"
  | "DOORBELL_RECOGNITION"
  | "DOOR_OPENED"
  | "DOOR_CLOSED"
  | "DOOR_SENSOR_JAMMED"
  | "FIRMWARE_UPDATE"
  | "DOOR_LOG_ENABLED"
  | "DOOR_LOG_DISABLED"
  | "INITIALIZATION"
  | "CALIBRATION"
  | "LOG_ENABLED"
  | "LOG_DISABLED"
  | "UNKNOWN";

export type Trigger =
  | "SYSTEM"
  | "MANUAL"
  | "BUTTON"
  | "AUTOMATIC"
  | "WEB"
  | "APP"
  | "AUTO_LOCK"
  | "ACCESSORY"
  | "KEYPAD"
  | "UNKNOWN";

export type State =
  | "SUCCESS"
  | "MOTOR_BLOCKED"
  | "CANCELED"
  | "TOO_RECENT"
  | "BUSY"
  | "LOW_MOTOR_VOLTAGE"
  | "CLUTCH_FAILURE"
  | "MOTOR_POWER_FAILURE"
  | "INCOMPLETE"
  | "REJECTED"
  | "REJECTED_NIGHT_MODE"
  | "OTHER_ERROR"
  | "UNKNOWN_ERROR"
  | "UNKNOWN";

export type OpenerSource =
  | "DOORBELL"
  /* cspell:disable-next-line */
  | "TIMECONTROL"
  | "APP"
  | "BUTTON"
  | "FOB"
  | "BRIDGE"
  | "KEYPAD"
  | "UNKNOWN";

export type OpenerLog = {
  activeCm: boolean;
  activeRto: boolean;
  source: OpenerSource;
  flagGeoFence: boolean;
  flagForce: boolean;
  flagDoorbellSuppression: boolean;
};

export type LogResponse = {
  feature: "DEVICE_LOGS";
  smartlockId: number;
  deviceType: DeviceType;
  name: string;
  action: Action;
  trigger: Trigger;
  state: State;
  autoUnlock: boolean;
  date: string;
  openerLog?: OpenerLog;
};

export interface INukiClient {
  getNotifications(): Promise<NotificationResponse[]>;
  getSmartlocks(): Promise<Smartlock[]>;
  getSmartlockLogs(lockId: number, fromDate?: Date): Promise<LogResponse[]>;
}
