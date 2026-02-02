import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

export const SleepMode = ({ hass, context, synapse }: TServiceParams) => {
  const sleepModeSwitch = synapse.switch({
    name: "Sleep Mode",
    context,
  });

  const theSwitch = hass.refBy.id(sleepModeSwitch.entity_id);

  hass.socket.onEvent({
    context,
    event: "sleep_mode_event",
    async exec() {
      await theSwitch.turn_on();
    },
  });

  theSwitch.onUpdate(async (oldState, newState) => {
    if (oldState.state === "off" && newState.state === "on") {
      const adaptiveLightingSleepModeSwitches: PICK_ENTITY<"switch">[] = [
        "switch.adaptive_lighting_sleep_mode_bathroom",
        "switch.adaptive_lighting_sleep_mode_bedroom",
        "switch.adaptive_lighting_sleep_mode_hallway",
        "switch.adaptive_lighting_sleep_mode_living_room",
      ];

      for (const theSwitch of adaptiveLightingSleepModeSwitches.map(hass.refBy.id)) {
        await theSwitch.turn_on();
      }
    }
  });

  return { sleepModeSwitch: theSwitch };
};
