import { CronExpression, TServiceParams } from "@digital-alchemy/core";

const EVERY_WEEK_MONDAY_AT_9 = "0 9 * * 1";

export function SchedulerService({
  scheduler,

  bens_flat: { scene, email },
  hass,
  context,
  synapse,
}: TServiceParams) {
  const { on, off } = scene.toggle({
    scene: "scene.night_audio",
    snapshot: ["number.bathroom_bass", "number.bedroom_speaker_bass", "number.living_room_bass"],
  });

  scheduler.cron({
    schedule: CronExpression.EVERY_DAY_AT_10PM,
    exec: on,
  });

  scheduler.cron({
    schedule: CronExpression.EVERY_DAY_AT_9AM,
    exec: off,
  });

  const sendMeterReadingButton = synapse.button({
    name: "Send meter reading",
    context,
  });

  const sendMeterReading = async () => {
    const meter = hass.refBy.id("sensor.electricity_meter");

    const emailContent = `
      Hi there

      please can you apply the following meter reading to my fuse account

      reading: ${meter.state}`;

    await email.send({
      from: "bwainwright28@gmail.com",
      to: "bwainwright28@gmail.com",
      subject: "Meter reading",
      body: emailContent,
    });
  };

  sendMeterReadingButton.onPress(sendMeterReading);

  scheduler.cron({
    schedule: EVERY_WEEK_MONDAY_AT_9,
    exec: sendMeterReading,
  });

  scheduler.cron({
    schedule: CronExpression.EVERY_DAY_AT_5AM,
    exec: () => {
      hass.call.switch.turn_on({
        entity_id: [
          "switch.adaptive_lighting_adapt_brightness_hallway",
          "switch.adaptive_lighting_adapt_brightness_bedroom",
          "switch.adaptive_lighting_adapt_brightness_bathroom",
          "switch.adaptive_lighting_adapt_brightness_living_room",
          "switch.autoplay_music",
        ],
      });
    },
  });
}
