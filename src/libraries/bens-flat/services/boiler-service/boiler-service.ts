import { TServiceParams } from "@digital-alchemy/core";
import { MDI_HEAT_WAVE, MDI_WATER_BOILER } from "../icons.ts";
import { RemoveCallback } from "@digital-alchemy/hass";

/**
 * My boiler has a main element and a boost switch. If they are on on at the same time,
 * the fuse will blow. This service creates virtual switches that
 * 1 - Provide the boost timeout behaviour, but also
 * 2 - Control the underlying switches in a way that ensures they are never on at the same time
 */
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
    if (boilerBoost.state !== "off") {
      await boilerBoost.waitForState("off");
    }
    await boilerMainElement.turn_on();
  });

  boilerSwitch.onTurnOff(async () => {
    await boilerMainElement.turn_off();
  });

  let clearBoostOff: RemoveCallback | undefined;

  boost.onTurnOn(async () => {
    await boilerMainElement.turn_off();
    if (boilerMainElement.state !== "off") {
      await boilerMainElement.waitForState("off");
    }
    await boilerBoost.turn_on();
    clearBoostOff = scheduler.setTimeout(async () => {
      await hass.call.switch.turn_off({
        entity_id: boost.entity_id,
      });
    }, [1, "hour"]);
  });

  boost.onTurnOff(async () => {
    clearBoostOff?.remove();
    await boilerBoost.turn_off();
    if (boilerSwitch.is_on) {
      if (boilerBoost.state !== "off") {
        await boilerBoost.waitForState("off");
      }
      await boilerMainElement.turn_on();
    }
  });
}
