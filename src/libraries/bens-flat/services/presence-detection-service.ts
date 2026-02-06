import { TServiceParams } from "@digital-alchemy/core";

export function PresenceDetectionService({
  hass,
  bens_flat,
  synapse,
  context,
  lifecycle,
}: TServiceParams) {
  const { motion, helpers } = bens_flat;

  const flatIsOccupied = synapse.binary_sensor({
    name: "Flat Occupied",
    unique_id: "flat_occupied_switch",
    suggested_object_id: "flat_occupied",
    context,
  });

  let allowZoneExit = true;

  motion.anywhere(() => {
    if (flatIsOccupied.is_on) {
      allowZoneExit = false;
      helpers.setDebouncedInterval(() => {
        allowZoneExit = true;
      }, "5m");
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

  return { flatIsOccupied: flatIsOccupied };
}
