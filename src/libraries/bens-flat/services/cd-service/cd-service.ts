import { TServiceParams } from "@digital-alchemy/core";

export function CdService({
  context,
  hass,
  synapse,
  bens_flat: { notify, motion, mediaPlayer },
}: TServiceParams) {
  const cdSwitch = synapse.switch({
    name: "CD mode",
    context,
    suggested_object_id: "cd",
  });

  const doorOpen = hass.refBy.id("binary_sensor.front_door_open");

  doorOpen.onUpdate(async (newState, oldState) => {
    if (newState.state === "on" && oldState.state === "off" && cdSwitch.is_on) {
      await mediaPlayer.play({
        id: `media-source://media_source/local/boop.mp3`,
        type: "audio/mpeg",
        announce: true,
        player: "media_player.whole_flat",
      });
    }
  });

  const outOfBounds = async () => {
    if (cdSwitch.is_on) {
      await notify.notifyCritical({ message: "someone is out of bounds", title: "alert" });
    }
  };

  motion.spareRoom(outOfBounds);
  motion.bedroom(outOfBounds);

  return { cdSwitch };
}
