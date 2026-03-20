import { TServiceParams } from "@digital-alchemy/core";

const APPLE_TV_SOURCE = "Apple TV";

export function SyncTvService({ hass }: TServiceParams) {
  const appleTv = hass.refBy.id("media_player.apple_tv");
  const tv = hass.refBy.id("media_player.tv");

  appleTv.onUpdate(async (newState, oldState) => {
    if (!newState || !oldState) return;
    if (newState.state === "idle" && oldState.state === "off" && tv.state !== "on") {
      await hass.call.button.press({
        entity_id: "button.turn_on_tv",
      });
      await tv.waitForState("on");
      await tv.select_source({ source: APPLE_TV_SOURCE });
    } else if (
      newState.state === "off" &&
      tv.state !== "off" &&
      tv.attributes.source === APPLE_TV_SOURCE
    ) {
      await tv.turn_off();
    }
  });
}
