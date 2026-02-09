import { TServiceParams } from "@digital-alchemy/core";
import { NotifyConfig } from "./notification.ts";

export function NagService({ bens_flat: { notify }, scheduler }: TServiceParams) {
  const nags: {
    callback: () => boolean | Promise<boolean>;
    message: NotifyConfig;
  }[] = [];

  scheduler.setTimeout(async () => {
    for (const nag of nags) {
      const { callback, message } = nag;
      const doNag = await callback();

      if (doNag) {
        await notify.notifyCritical(message);
      }
    }
  }, "30m");

  const add = ({
    trigger: callback,
    notification,
  }: {
    trigger: () => boolean | Promise<boolean>;
    notification: NotifyConfig;
  }) => {
    nags.push({
      callback,
      message: notification,
    });
  };

  return { add };
}
