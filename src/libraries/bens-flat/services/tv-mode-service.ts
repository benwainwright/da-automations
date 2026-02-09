import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";
import { v7 } from "uuid";

export function TVModeService({ hass, synapse, context, logger }: TServiceParams) {
  const tvMode = synapse.switch({
    name: "TV Mode",
    context,
    unique_id: "tv_mode_switch",
    suggested_object_id: "tv_mode",
    icon: "mdi:television",
  });

  const xboxInGame = hass.refBy.id("binary_sensor.xbox_network_in_game");
  const appleTv = hass.refBy.id("media_player.apple_tv");
  const ps5NowPlaying = hass.refBy.id("sensor.ps5_now_playing");

  xboxInGame.onUpdate(async (newState, oldState) => {
    if (!newState) return;
    if (oldState.state === "off" && newState.state === "on") {
      await tvMode.getEntity().turn_on();
    } else if (oldState.state === "on" && newState.state === "off") {
      await tvMode.getEntity().turn_off();
    }
  });

  ps5NowPlaying.onUpdate(async (newState, oldState) => {
    if (!newState) return;
    if (oldState.state === "unknown" && newState.state !== "unknown") {
      await tvMode.getEntity().turn_on();
    } else if (oldState.state !== "unknown" && newState.state === "unknown") {
      await tvMode.getEntity().turn_off();
    }
  });

  appleTv.onUpdate(async (newState, oldState) => {
    if (!newState) {
      return;
    }
    const attributes = newState.attributes as (typeof newState)["attributes"] & {
      app_id: string;
    };

    const isYoutube = attributes.app_id === "com.google.ios.youtube";
    const isSpotify = attributes.app_id === "com.spotify.client";

    if (oldState.state !== "playing" && newState.state === "playing" && !isYoutube && !isSpotify) {
      await tvMode.getEntity().turn_on();
    } else if (oldState.state === "playing" && newState.state !== "playing") {
      await tvMode.getEntity().turn_off();
    }
  });

  const toggleScene = ({
    scene,
    snapshot,
  }: {
    scene: PICK_ENTITY<"scene">;
    snapshot: PICK_ENTITY | PICK_ENTITY[];
  }) => {
    const id = v7();

    const on = async () => {
      await hass.call.scene.create({
        scene_id: id,
        snapshot_entities: snapshot,
      });

      await hass.call.scene.turn_on({
        entity_id: scene,
      });
    };

    const off = async () => {
      await hass.call.scene.turn_on({
        entity_id: `scene.${id}` as PICK_ENTITY<"scene">,
      });

      await hass.call.scene.delete({
        entity_id: `scene.${id}` as PICK_ENTITY<"scene">,
      });
    };

    return { on, off };
  };

  tvMode.getEntity().onUpdate(async (newState, oldState) => {
    const toggler = toggleScene({
      scene: "scene.tv_mode",
      snapshot: [
        "light.living_room_floor_lamp_bottom",
        "light.living_room_floor_lamp_middle",
        "light.living_room_floor_lamp_top",
        "light.kitchen_fridge",
        "light.kitchen_oven",
        "light.kitchen_sink",
        "light.kitchen_washing_machine",
        "light.living_room_tv_wall",
        "light.living_room_bookcase",
        "light.living_room_back_wall_left",
        "light.living_room_back_wall_middle",
        "light.living_room_back_wall_right",
        "switch.adaptive_lighting_living_room",
        "switch.autoplay_music",
        "media_player.flat",
      ],
    });
    if (newState.state === "on" && oldState.state !== "on") {
      await toggler.on();
    } else if (newState.state === "off" && oldState.state !== "off") {
      await toggler.off();
    }
  });

  const isOn = () => {
    const tvModeState = Boolean(tvMode.is_on);
    logger.info(`Checking tv mode is on: ${tvModeState}`);
    return tvModeState;
  };

  return { tvModeSwitch: tvMode, isOn };
}
