import { TServiceParams } from "@digital-alchemy/core";

export function BedSensorService({ hass, bens_flat: { entityIds, state } }: TServiceParams) {
  const bedOccupied = hass.refBy.id(entityIds.binarySensor.bedOccupiedEither);
  const bedroomMotionSensor = hass.refBy.id(entityIds.switches.bedroomMotionSensor);

  bedOccupied.onUpdate(
    state.to("off", async () => {
      await bedroomMotionSensor.turn_on();
    }),
  );

  bedOccupied.onUpdate(
    state.to("on", async () => {
      await bedroomMotionSensor.turn_off();
    }),
  );
}
