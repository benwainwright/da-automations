import { TServiceParams } from "@digital-alchemy/core";

export function PresenceDetectionService({
  hass,
  bens_flat,
  synapse,
  context,
  logger,
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

  const home = hass.refBy.id("zone.home");

  motion.anywhere(() => {
    logger.info(`Motion detected, checking if flat is occupied`);
    if (flatIsOccupied.is_on) {
      logger.info(`Flat is occupied, turn off zone exits`);
      allowZoneExit = false;
      helpers.setDebouncedInterval(() => {
        logger.info(`Zone exits enabled`);
        allowZoneExit = true;
        if (home.state === 0) {
          flatIsOccupied.is_on = false;
        }
      }, "5m");
    } else {
      logger.info(`Re-occupying flat`);
      flatIsOccupied.is_on = true;
    }
  });

  lifecycle.onReady(() => {
    home.onUpdate((oldState, newState) => {
      if (oldState.state > 0 && newState.state === 0 && allowZoneExit) {
        flatIsOccupied.is_on = false;
      }
    });
  });

  return { flatIsOccupied: flatIsOccupied };
}
