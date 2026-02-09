import { TServiceParams } from "@digital-alchemy/core";
import { ByIdProxy, PICK_ENTITY } from "@digital-alchemy/hass";

type BatteryEntity = Omit<ByIdProxy<PICK_ENTITY<"sensor">>, "attributes"> & {
  attributes: Extract<ByIdProxy<PICK_ENTITY<"sensor">>["attributes"], { device_class: "battery" }>;
};

export function BatteryService({
  hass,
  bens_flat: { nags, presence, sleepMode, tvMode },
}: TServiceParams) {
  const getVeryLowBatteries = () =>
    hass.refBy
      .domain("sensor")
      .filter((sensor): sensor is BatteryEntity => sensor.attributes["device_class"] === "battery")
      .filter((sensor) => Number(sensor.state) < 30);

  nags.add({
    notification: {
      title: "Low Batteries",
      message: "You have one or more batteries with very low charge",
    },
    trigger: () =>
      Boolean(
        presence.flatIsOccupied() &&
        !sleepMode.isOn() &&
        !tvMode.isOn() &&
        getVeryLowBatteries().length > 0,
      ),
  });
}
