import { type TServiceParams } from "@digital-alchemy/core";
import type { PICK_ENTITY } from "@digital-alchemy/hass";
import { FIVE_AM } from "./constants.ts";

export function SleepModeService({
  hass,
  context,
  synapse,
  bens_flat,
  automation: { time },
}: TServiceParams) {
  const { helpers, lights, motion } = bens_flat;

  const sleepMode = synapse.switch({
    name: "Sleep Mode",
    context,
    icon: "mdi:sleep",
  });

  hass.socket.onEvent({
    context,
    event: "sleep_mode_event",
    async exec() {
      await sleepMode.getEntity().turn_on();
    },
  });

  const adaptiveLightingSleepModeSwitches: PICK_ENTITY<"switch">[] = [
    "switch.adaptive_lighting_sleep_mode_hallway",
    "switch.adaptive_lighting_sleep_mode_living_room",
    "switch.adaptive_lighting_sleep_mode_bathroom",
    "switch.adaptive_lighting_sleep_mode_hallway",
  ];

  sleepMode.onTurnOn(async () => {
    await lights.turnOffAll();
    await helpers.turnOnAll(adaptiveLightingSleepModeSwitches);
  });

  sleepMode.onTurnOff(async () => {
    await helpers.turnOffAll(adaptiveLightingSleepModeSwitches);
  });

  motion.livingRoom(async () => {
    if (time.isAfter(FIVE_AM)) {
      await hass.call.switch.turn_off(sleepMode);
    }
  });

  return { sleepModeSwitch: sleepMode };
}
