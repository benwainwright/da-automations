import { type TServiceParams } from "@digital-alchemy/core";
import type { PICK_ENTITY } from "@digital-alchemy/hass";
import { FIVE_AM, THREE_PM } from "../constants.ts";

export function SleepModeService({
  hass,
  context,
  synapse,
  bens_flat: { helpers, lights, motion, briefing, visitor },
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

  const { trigger: readBriefing, reset: resetBriefing } = helpers.latch(briefing.read, true);

  sleepMode.onTurnOn(async () => {
    await lights.turnOffAll();
    await helpers.turnOnAll(adaptiveLightingSleepModeSwitches);
    resetBriefing();
  });

  sleepMode.onTurnOff(async () => {
    await helpers.turnOffAll(adaptiveLightingSleepModeSwitches);
  });

  const morningTrigger = async () => {
    const sleepModeEntity = sleepMode.entity_id;
    const visitorModeEntity = visitor?.visitorMode?.getEntity?.();
    const visitorModeIsOn = visitorModeEntity?.state === "on";
    if (time.isAfter(FIVE_AM) && sleepModeEntity && !visitorModeIsOn && time.isBefore(THREE_PM)) {
      await hass.call.switch.turn_off({ entity_id: sleepModeEntity });
      await readBriefing();
    }
  };

  motion.livingRoom(morningTrigger);
  motion.hallway(morningTrigger);
  motion.bathroom(morningTrigger);

  const isOn = () => {
    const sleepModeState = Boolean(sleepMode.is_on);
    logger.info(`Checking sleep mode is on: ${sleepModeState}`);
    return sleepModeState;
  };

  return { sleepModeSwitch: sleepMode, isOn };
}
