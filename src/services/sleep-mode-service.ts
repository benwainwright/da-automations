import type { TServiceParams } from "@digital-alchemy/core";
import type { PICK_ENTITY, TAreaId } from "@digital-alchemy/hass";

export function SleepModeService({ hass, context, synapse }: TServiceParams) {
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

  sleepMode.getEntity().onUpdate(async (newState, oldState) => {
    if (oldState.state === "off" && newState.state === "on") {
      const adaptiveLightingSleepModeSwitches: PICK_ENTITY<"switch">[] = [
        "switch.adaptive_lighting_sleep_mode_hallway",
        "switch.adaptive_lighting_sleep_mode_living_room",
      ];

      const areas: TAreaId[] = ["bathroom", "bathroom", "bedroom", "hallway", "living_room"];

      await Promise.all(areas.map(async (area) => hass.call.light.turn_off({ area_id: area })));

      for (const theSwitch of adaptiveLightingSleepModeSwitches.map(hass.refBy.id)) {
        await theSwitch.turn_on();
      }
    }
  });

  sleepMode.getEntity().onUpdate(async (newState, oldState) => {
    if (oldState.state === "on" && newState.state === "on") {
      const adaptiveLightingSleepModeSwitches: PICK_ENTITY<"switch">[] = [
        "switch.adaptive_lighting_sleep_mode_hallway",
        "switch.adaptive_lighting_sleep_mode_living_room",
      ];

      for (const theSwitch of adaptiveLightingSleepModeSwitches.map(hass.refBy.id)) {
        await theSwitch.turn_off();
      }
    }
  });

  return { sleepModeSwitch: sleepMode.getEntity() };
}
