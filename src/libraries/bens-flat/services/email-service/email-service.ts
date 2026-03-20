import { TServiceParams } from "@digital-alchemy/core";
import { NotificationData } from "@digital-alchemy/hass";

export function EmailService({ hass }: TServiceParams) {
  interface SendEmailParams {
    from: string;
    to: string;
    subject: string;
    body: string;
  }

  const send = async ({ from, to, subject, body }: SendEmailParams) => {
    const data = {
      from,
    } as NotificationData;

    await hass.call.notify.bwainwright28_gmail_com({
      target: to,
      message: body,
      title: subject,
      data,
    });
  };

  return { send };
}
