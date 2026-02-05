import { TServiceParams } from "@digital-alchemy/core";
import { RemoveCallback } from "@digital-alchemy/hass";

export function PresenceDetectionService({
  hass,
  bens_flat,
  scheduler,
  synapse,
  context,
  lifecycle,
}: TServiceParams) {
  const { helpers } = bens_flat;

  const flatIsOccupied = synapse.binary_sensor({
    name: "Flat Occupied",
    context,
  });

  let allowZoneExit = true;
  let callback: RemoveCallback | undefined;

  helpers.allMotionSensors.forEach((sensorId) => {
    if (flatIsOccupied.is_on) {
      const sensor = hass.refBy.id(sensorId);
      sensor.onUpdate(() => {
        allowZoneExit = false;
        callback = scheduler.setTimeout(() => {
          allowZoneExit = true;
          callback?.remove();
          callback = undefined;
        }, "5m");
      });
    } else {
      flatIsOccupied.is_on = true;
    }
  });

  const home = hass.refBy.id("zone.home");

  lifecycle.onReady(() => {
    home.onUpdate((oldState, newState) => {
      if (oldState.state > 0 && newState.state === 0 && allowZoneExit) {
        flatIsOccupied.is_on = false;
      }
    });
  });

  return { flatIsOccupied: flatIsOccupied.getEntity() };
}
