import type { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY, TAreaId } from "@digital-alchemy/hass";

export function HelpersService({ hass }: TServiceParams) {
  const allAreas: TAreaId[] = ["bathroom", "bathroom", "bedroom", "hallway", "living_room"];

  const allMotionSensors: PICK_ENTITY<"binary_sensor">[] = [
    "binary_sensor.bedroom_occupancy",
    "binary_sensor.hallway_occupancy",
    "binary_sensor.bathroom_occupancy",
    "binary_sensor.living_room_occupancy",
  ];

  const turnOffSwitches = async (switches: PICK_ENTITY<"switch">[]) => {
    await Promise.all(
      switches.map(async (theSwitch) => await hass.call.switch.turn_off({ entity_id: theSwitch })),
    );
  };

  const turnOnSwitches = async (switches: PICK_ENTITY<"switch">[]) => {
    await Promise.all(
      switches.map(async (theSwitch) => await hass.call.switch.turn_on({ entity_id: theSwitch })),
    );
  };

  return {
    turnOffSwitches,
    turnOnSwitches,
    allAreas,
    allMotionSensors,
  };
}
