import { TServiceParams } from "@digital-alchemy/core";

export function BedSensorService({ hass, bens_flat: { entityIds } }: TServiceParams) {
  const bedOccupied = hass.refBy.id(entityIds.binarySensor.bedOccupiedEither);
  const bedroomMotionSensor = hass.refBy.id(entityIds.switches.bedroomMotionSensor);

  bedOccupied.onUpdate(async (newState, oldState) => {
    if (!newState || !oldState) return;

    if (newState.state === "on" && oldState.state !== "on" && bedroomMotionSensor.state === "on") {
      await bedroomMotionSensor.turn_off();
    }
  });

  bedOccupied.onUpdate(async (newState, oldState) => {
    if (!newState || !oldState) return;

    if (
      newState.state === "off" &&
      oldState.state !== "on" &&
      bedroomMotionSensor.state === "off"
    ) {
      await bedroomMotionSensor.turn_on();
    }
  });
}
