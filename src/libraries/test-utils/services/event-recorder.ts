import { TOffset, TServiceParams } from "@digital-alchemy/core";
import { writeFile } from "node:fs/promises";

export function EventRecorder({ hass, context, scheduler }: TServiceParams) {
  const recordChanges = async (outputFile: string, offset: TOffset) => {
    const stateChanges: object[] = [];

    const finish = hass.socket.onEvent({
      event: "state_changed",
      context,
      exec: (event) => {
        stateChanges.push(event);
      },
    });

    await new Promise<void>((accept) => scheduler.setInterval(accept, offset));

    finish.remove();
    await writeFile(outputFile, JSON.stringify(stateChanges));
  };

  return { recordChanges };
}
