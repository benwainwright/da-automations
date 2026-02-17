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

  const flatIsOccupiedSwitch = synapse.binary_sensor({
    name: "Flat Occupied",
    unique_id: "flat_occupied_switch",
    suggested_object_id: "flat_occupied",
    context,
  });

  let allowZoneExit = true;

  const home = hass.refBy.id("zone.home");

  motion.anywhere(() => {
    logger.info(`Motion detected, checking if flat is occupied`);

    if (flatIsOccupiedSwitch.is_on) {
      logger.info(`Flat is occupied, turn off zone exits`);
      allowZoneExit = false;
      helpers.setDebouncedTimeout(() => {
        logger.info(`Zone exits enabled`);
        allowZoneExit = true;
        if (home.state === 0) {
          logger.info(`Setting flat occupied to false`);
          flatIsOccupiedSwitch.is_on = false;
        }
      }, "5m");
    } else {
      logger.info(`Re-occupying flat`);
      flatIsOccupiedSwitch.is_on = true;
    }
  });

  lifecycle.onReady(() => {
    home.onUpdate((newState, oldState) => {
      if (oldState.state > 0 && newState.state === 0 && allowZoneExit) {
        flatIsOccupiedSwitch.is_on = false;
      }
    });
  });

  const flatIsOccupied = () => {
    return flatIsOccupiedSwitch.is_on;
  };

  return { flatIsOccupiedSwitch, flatIsOccupied };
}
