import { TServiceParams } from "@digital-alchemy/core";
import { NotifyConfig } from "../notification/notification.ts";

export function NagService({ bens_flat: { notify }, scheduler, synapse, context }: TServiceParams) {
  const nagMode = synapse.switch({
    context,
    suggested_object_id: "nag_mode",
    name: "Nag Mode",
  });
  const nags: {
    callback: () => boolean | Promise<boolean>;
    message: NotifyConfig;
  }[] = [];

  scheduler.setInterval(async () => {
    if (!nagMode.is_on) return;
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
