import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

interface ICommandParams {
  player: PICK_ENTITY<"media_player">;
  command: string;
}

export function AlexaMediaPlayerService({ bens_flat: { mediaPlayer } }: TServiceParams) {
  const command = async ({ player, command }: ICommandParams) => {
    await mediaPlayer.play({
      id: command,
      player,
      type: "custom",
    });
  };

  return { command };
}
