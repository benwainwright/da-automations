import { PICK_ENTITY, TAreaId } from "@digital-alchemy/hass";
import { testRunner } from "@test-helpers";
import { expect, spyOn, test } from "bun:test";

type MotionSensorTestConfig = [
  occupancySensor: PICK_ENTITY<"binary_sensor">,
  enableSwitch: PICK_ENTITY<"switch">,
  area: TAreaId,
];

test.each<MotionSensorTestConfig>([
  ["binary_sensor.bathroom_occupancy", "switch.bathroom_motion_sensor", "bathroom"],
  ["binary_sensor.living_room_occupancy", "switch.living_room_motion_sensor", "living_room"],
  ["binary_sensor.hallway_occupancy", "switch.halllway_motion_sensor", "hallway"],
  ["binary_sensor.bedroom_occupancy", "switch.bedroom_motion_sensor", "bedroom"],
])(
  "when %s switches on and %s is aleady on then lights turn on in the %s",
  async (occupancySensor, enableSwitch, area) => {
    await testRunner
      .bootLibrariesFirst()
      .setup(async ({ mock_assistant }) => {
        mock_assistant.entity.setupState({
          [occupancySensor]: { state: "off" },
          [enableSwitch]: { state: "on" },
        });
      })
      .run(async ({ hass, mock_assistant, lifecycle }) => {
        lifecycle.onReady(async () => {
          const turnOnSpy = spyOn(hass.call.light, "turn_on");

          await mock_assistant.entity.emitChange(occupancySensor, {
            state: "on",
          });

          expect(turnOnSpy).toHaveBeenCalledWith({
            area_id: area,
          });
        });
      });
  },
);

type MotionSensorTestConfigWithSwitchOff = [
  occupancySensor: PICK_ENTITY<"binary_sensor">,
  enableSwitch: PICK_ENTITY<"switch">,
];

test.each<MotionSensorTestConfigWithSwitchOff>([
  ["binary_sensor.bathroom_occupancy", "switch.bathroom_motion_sensor"],
  ["binary_sensor.living_room_occupancy", "switch.living_room_motion_sensor"],
  ["binary_sensor.hallway_occupancy", "switch.halllway_motion_sensor"],
  ["binary_sensor.bedroom_occupancy", "switch.bedroom_motion_sensor"],
])(
  "when %s switches on and %s is off then no lights turn on",
  async (occupancySensor, enableSwitch) => {
    await testRunner
      .bootLibrariesFirst()
      .setup(async ({ mock_assistant }) => {
        mock_assistant.entity.setupState({
          [occupancySensor]: { state: "off" },
          [enableSwitch]: { state: "off" },
        });
      })
      .run(async ({ hass, mock_assistant, lifecycle }) => {
        lifecycle.onReady(async () => {
          const turnOnSpy = spyOn(hass.call.light, "turn_on");

          await mock_assistant.entity.emitChange(occupancySensor, {
            state: "on",
          });

          expect(turnOnSpy).not.toHaveBeenCalled();
        });
      });
  },
);

type MotionSensorTestConfigWithBlockingSwitch = [
  occupancySensor: PICK_ENTITY<"binary_sensor">,
  enableSwitch: PICK_ENTITY<"switch">,
  blockingSwitch: PICK_ENTITY<"switch">,
];

test.each<MotionSensorTestConfigWithBlockingSwitch>([
  ["binary_sensor.bedroom_occupancy", "switch.bedroom_motion_sensor", "switch.sleep_mode"],
  ["binary_sensor.living_room_occupancy", "switch.living_room_motion_sensor", "switch.tv_mode"],
])(
  "when %s switches on and %s is on but %s is on then no lights turn on",
  async (occupancySensor, enableSwitch, blockingSwitch) => {
    await testRunner
      .bootLibrariesFirst()
      .setup(async ({ mock_assistant }) => {
        mock_assistant.entity.setupState({
          [occupancySensor]: { state: "off" },
          [enableSwitch]: { state: "on" },
          [blockingSwitch]: { state: "on" },
        });
      })
      .run(async ({ hass, mock_assistant, lifecycle }) => {
        lifecycle.onReady(async () => {
          const turnOnSpy = spyOn(hass.call.light, "turn_on");

          await mock_assistant.entity.emitChange(occupancySensor, {
            state: "on",
          });

          expect(turnOnSpy).not.toHaveBeenCalled();
        });
      });
  },
);
