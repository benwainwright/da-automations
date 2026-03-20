import { TServiceParams } from "@digital-alchemy/core";
import { MDI_HEAT_WAVE, MDI_WATER_BOILER } from "../icons.ts";
import { RemoveCallback } from "@digital-alchemy/hass";

export function BoilerService({ hass, synapse, context, scheduler }: TServiceParams) {
  const boilerMainElement = hass.refBy.id("switch.boiler_main_element");
  const boilerBoost = hass.refBy.id("switch.boiler_boost_switch");

  const boilerSwitch = synapse.switch({
    context,
    name: "Boiler",
    suggested_object_id: "boiler",
    icon: MDI_WATER_BOILER,
  });

  const boost = synapse.switch({
    context,
    name: "Boiler Boost",
    suggested_object_id: "boiler_boost",
    icon: MDI_HEAT_WAVE,
  });

  boilerSwitch.onTurnOn(async () => {
    await boilerBoost.turn_off();
    await boilerBoost.waitForState("off");
    await boilerMainElement.turn_on();
  });

  let clearBoostOff: RemoveCallback | undefined;

  boost.onTurnOn(async () => {
    await boilerMainElement.turn_off();
    await boilerMainElement.waitForState("off");
    await boilerBoost.turn_on();
    clearBoostOff = scheduler.setTimeout(async () => {
      await boilerBoost.turn_off();
      await boilerBoost.waitForState("off");
      if (boilerSwitch.is_on) {
        await boilerMainElement.turn_on();
      }
    }, [1, "hour"]);
  });

  boost.onTurnOff(async () => {
    clearBoostOff?.remove();
    await boilerBoost.turn_off();
    if (boilerSwitch.is_on) {
      await boilerBoost.waitForState("off");
      await boilerMainElement.turn_on();
    }
  });
}
