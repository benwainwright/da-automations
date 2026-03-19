import { TServiceParams } from "@digital-alchemy/core";

export function SyncTvService({ hass }: TServiceParams) {
  const appleTv = hass.refBy.id("media_player.apple_tv");
  const tv = hass.refBy.id("media_player.tv");

  appleTv.onUpdate(async (newState, oldState) => {
    if (newState.state === "idle" && oldState.state === "off" && tv.state !== "on") {
      await hass.call.button.press({
        entity_id: "button.turn_on_tv",
      });
      await tv.waitForState("on");
      await tv.select_source({ source: "Apple TV" });
    } else if (newState.state === "off" && tv.state !== "off") {
      await tv.turn_off();
    }
  });
}
