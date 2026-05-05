import { TServiceParams } from "@digital-alchemy/core";

interface IMacServiceReturn {
  turnScreenOff: () => Promise<void>;
  shutdown: () => Promise<void>;
}

export function IMacService({ hass }: TServiceParams): IMacServiceReturn {
  const turnScreenOff = async () => {
    await hass.call.mqtt.publish({
      topic: "iMac/commands/screen_off",
    });
  };

  const shutdown = async () => {
    await hass.call.mqtt.publish({
      topic: "iMac/commands/shutdown",
    });
  };

  return {
    turnScreenOff,
    shutdown,
  };
}
