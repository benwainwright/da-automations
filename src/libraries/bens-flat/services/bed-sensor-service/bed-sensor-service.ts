import { TServiceParams } from "@digital-alchemy/core";

export function BedSensorService({ hass, bens_flat: { entityIds, state } }: TServiceParams) {
  const bedOccupied = hass.refBy.id(entityIds.binarySensor.bedOccupiedEither);
  const bedroomMotionSensor = hass.refBy.id(entityIds.switches.bedroomMotionSensor);
  const bedroomLights = hass.refBy.id(entityIds.light.bedroom);

  bedOccupied.onUpdate(
    state.from("on").to("off", async () => {
      await bedroomMotionSensor.turn_on();

      if (bedroomLights.state === "off") {
        await bedroomLights.turn_on();
      }
    }),
  );

  bedOccupied.onUpdate(
    state.to("on", async () => {
      await bedroomMotionSensor.turn_off();
    }),
  );
}
