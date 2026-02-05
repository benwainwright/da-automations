import { type TServiceParams } from "@digital-alchemy/core";
import type { PICK_ENTITY } from "@digital-alchemy/hass";

export function SleepModeService({ hass, context, synapse, bens_flat }: TServiceParams) {
  const { helpers } = bens_flat;

  const sleepMode = synapse.switch({
    name: "Sleep Mode",
    context,
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
    await helpers.turnOnSwitches(adaptiveLightingSleepModeSwitches);
  });

  sleepMode.onTurnOff(async () => {
    await helpers.turnOffSwitches(adaptiveLightingSleepModeSwitches);
  });

  return { sleepModeSwitch: sleepMode.getEntity() };
}
