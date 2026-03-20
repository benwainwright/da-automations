import { TServiceParams } from "@digital-alchemy/core";
import { MDI_HEAT_WAVE, MDI_WATER_BOILER } from "../icons.ts";

export function BoilerService({ hass, synapse, context, scheduler }: TServiceParams) {
  const boilerMainElement = hass.refBy.id("switch.boiler_main_element");
  const boilerBoost = hass.refBy.id("switch.boiler_boost_switch");

  const boilerSwitch = synapse.switch({
    context,
    name: "Boiler",
    suggested_object_id: "boiler",
    icon: MDI_WATER_BOILER,
  });

  const boost = synapse.button({
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

  boost.onPress(async () => {
    await boilerMainElement.turn_off();
    await boilerMainElement.waitForState("off");
    await boilerBoost.turn_on();
    scheduler.setTimeout(async () => {
      await boilerBoost.turn_off();
    }, [1, "hour"]);
  });
}
