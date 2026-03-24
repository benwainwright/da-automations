import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

export const sendMeterReading = (
  meterSensor: PICK_ENTITY<"sensor">,
  hass: TServiceParams["hass"],
  email: TServiceParams["bens_flat"]["email"],
) => {
  return async () => {
    const meter = hass.refBy.id(meterSensor);

    const [reading] = meter.state.toString().split(".");

    const emailContent = `Dear Fuse support. <br /><br />Please can you apply the following meter reading to my fuse account.
   <br /><br />Reading: ${reading}
   <br />
   <br />
   Regards,<br />
   Ben Wainwright`;

    await email.send({
      from: "bwainwright28@gmail.com",
      to: "support@fuseenergy.com",
      subject: "Meter reading",
      body: emailContent,
    });
  };
};
