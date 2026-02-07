import { TServiceParams } from "@digital-alchemy/core";
import { ByIdProxy, PICK_ENTITY } from "@digital-alchemy/hass";

type BatteryEntity = Omit<ByIdProxy<PICK_ENTITY<"sensor">>, "attributes"> & {
  attributes: Extract<ByIdProxy<PICK_ENTITY<"sensor">>["attributes"], { device_class: "battery" }>;
};

export const NagService = ({
  hass,
  bens_flat: { presence, sleepMode, notify, tvMode },
  scheduler,
}: TServiceParams) => {
  const getVeryLowBatteries = () =>
    hass.refBy
      .domain("sensor")
      .filter((sensor): sensor is BatteryEntity => sensor.attributes["device_class"] === "battery")
      .filter((sensor) => Number(sensor.state) < 30);

  scheduler.setTimeout(async () => {
    if (presence.flatIsOccupied() && !sleepMode.isOn() && !tvMode.isOn()) {
      const veryLowBatteries = getVeryLowBatteries();

      if (veryLowBatteries.length > 0) {
        await notify.notifyCritical({
          title: "Battery low",
          message: "You have some batteries below 30%",
        });
      }
    }
  }, "30m");
};
