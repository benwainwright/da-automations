import { TServiceParams } from "@digital-alchemy/core";

interface NotifyConfig {
  title: string;
  message: string;
}

export function NotificationService({ hass }: TServiceParams) {
  const tv = hass.refBy.id("media_player.tv");
  const notify = ({ message, title }: NotifyConfig) => {
    if (tv.state === "on") {
      hass.call.notify.lg_webos_tv_oled55c8pla({
        message,
        title,
      });
    }
  };

  return { notify };
}
