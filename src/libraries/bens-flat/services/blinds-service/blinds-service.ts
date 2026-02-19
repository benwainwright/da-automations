import { TServiceParams } from "@digital-alchemy/core";
import { FIVE_AM } from "../constants.ts";

export function BlindsService({
  synapse,
  hass,
  context,
  lifecycle,
  automation: { time, solar },
  bens_flat,
}: TServiceParams) {
  const { motion } = bens_flat;
  const blindsDefaultClosed = synapse.switch({
    name: "Blinds default closed",
    unique_id: "blinds_default_closed_switch",
    suggested_object_id: "blinds_default_closed",
    attributes: {
      area: "living_room",
    },
    context,
  });

  solar.onEvent({
    eventName: "sunset",
    exec: () => (blindsDefaultClosed.is_on = true),
  });

  motion.livingRoom(async () => {
    if (time.isAfter(FIVE_AM) && solar.isBefore("sunset")) {
      blindsDefaultClosed.is_on = false;
    }
  });

  const blinds = hass.refBy.id("cover.living_room_blinds");

  lifecycle.onReady(() => {
    blindsDefaultClosed.onUpdate(async (nextState, oldState) => {
      if (!nextState) {
        return null;
      }

      if (nextState.state === "on" && oldState.state === "off") {
        await blinds.close_cover();
      } else if (nextState.state === "off" && oldState.state === "on") {
        await blinds.open_cover();
      }
    });
  });

  const closeIfDefaultIsClosed = async () => {
    if (blindsDefaultClosed.is_on) {
      await blinds.close_cover();
    }
  };

  const openIfDefaultIsOpen = async () => {
    const entity = blindsDefaultClosed.getEntity();
    if (entity.state !== "on") {
      await blinds.open_cover();
    }
  };

  const close = async () => {
    await blinds.close_cover();
  };

  return { closeIfDefaultIsClosed, openIfDefaultIsOpen, close };
}
