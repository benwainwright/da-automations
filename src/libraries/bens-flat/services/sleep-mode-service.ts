import { type TServiceParams } from "@digital-alchemy/core";
import type { PICK_ENTITY } from "@digital-alchemy/hass";
import { FIVE_AM } from "./constants.ts";

export function SleepModeService({
  hass,
  context,
  synapse,
  bens_flat: { helpers, lights, motion },
  logger,
  automation: { time },
}: TServiceParams) {
  const sleepMode = synapse.switch({
    name: "Sleep Mode",
    context,
    icon: "mdi:sleep",
    unique_id: "sleep_mode_switch",
    suggested_object_id: "sleep_mode",
  });

  hass.socket.onEvent({
    context,
    event: "sleep_mode_event",
    async exec() {
      const sleepModeEntity = sleepMode.getEntity();
      if (!sleepModeEntity) {
        logger.warn(`Skipping sleep mode event; entity is unavailable`);
        return;
      }

      await sleepModeEntity.turn_on();
    },
  });

  const adaptiveLightingSleepModeSwitches: PICK_ENTITY<"switch">[] = [
    "switch.adaptive_lighting_sleep_mode_hallway",
    "switch.adaptive_lighting_sleep_mode_living_room",
    "switch.adaptive_lighting_sleep_mode_bathroom",
    "switch.adaptive_lighting_sleep_mode_spare_room",
  ];

  sleepMode.onTurnOn(async () => {
    await lights.turnOffAll();
    await helpers.turnOnAll(adaptiveLightingSleepModeSwitches);
  });

  sleepMode.onTurnOff(async () => {
    await helpers.turnOffAll(adaptiveLightingSleepModeSwitches);
  });

  motion.livingRoom(async () => {
    const sleepModeEntity = sleepMode.entity_id;
    if (time.isAfter(FIVE_AM) && sleepModeEntity) {
      await hass.call.switch.turn_off({ entity_id: sleepModeEntity });
    }
  });

  const isOn = () => {
    const sleepModeState = Boolean(sleepMode.is_on);
    logger.info(`Checking sleep mode is on: ${sleepModeState}`);
    return sleepModeState;
  };

  return { sleepModeSwitch: sleepMode, isOn };
}
