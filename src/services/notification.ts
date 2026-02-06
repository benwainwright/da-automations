import { TServiceParams } from "@digital-alchemy/core";

interface NotifyConfig {
  title: string;
  message: string;
}

export function NotificationService({ hass }: TServiceParams) {
  const tv = hass.refBy.id("media_player.tv");
  const notify = async ({ message, title }: NotifyConfig) => {
    if (tv.state === "on") {
      hass.call.notify.tv({
        message,
        title,
      });

      await hass.call.notify.mobile_app_bens_phone.call({ message, title });
    }
  };

  const notifyCritical = async ({ message, title }: NotifyConfig) => {
    if (tv.state === "on") {
      hass.call.notify.tv({
        message,
        title,
        data: {
          push: {
            interruption_level: "critical",
          },
        },
      });
    }
  };

  return { notify, notifyCritical };
}
