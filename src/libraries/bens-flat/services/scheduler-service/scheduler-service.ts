import { CronExpression, TServiceParams } from "@digital-alchemy/core";
import { sendMeterReading } from "./send-meter-reading.ts";

const EVERY_WEEK_MONDAY_AT_9 = "0 9 * * 1";

export function SchedulerService({
  scheduler,
  lifecycle,
  bens_flat: { scene, email, entityIds, briefing, todoList },
  hass,
}: TServiceParams) {
  const { on, off } = scene.toggle({
    scene: entityIds.scene.nightAuto,
    snapshot: [
      entityIds.number.hallwaySpeakerBass,
      entityIds.number.bathroomSpeakerBass,
      entityIds.number.bedroomSpeakerBass,
      entityIds.number.livingRoomSpeakerBass,
    ],
  });

  lifecycle.onReady(() => {
    scheduler.cron({
      schedule: CronExpression.EVERY_DAY_AT_10PM,
      exec: on,
    });

    scheduler.cron({
      schedule: CronExpression.EVERY_DAY_AT_9AM,
      exec: off,
    });

    scheduler.cron({
      schedule: CronExpression.EVERY_DAY_AT_4AM,
      exec: () => todoList.scheduleTodoistTasks(),
    });

    scheduler.cron({
      schedule: EVERY_WEEK_MONDAY_AT_9,
      exec: sendMeterReading(entityIds.sensor.electricityMeter, hass, email),
    });

    scheduler.cron({
      schedule: CronExpression.EVERY_DAY_AT_5AM,
      exec: () => {
        hass.call.switch.turn_on({
          entity_id: [
            briefing.remindersSwitch.entity_id,
            entityIds.switches.adaptiveLightingBathroom,
            entityIds.switches.adaptiveLightingBedroom,
            entityIds.switches.adaptiveLightingHallway,
            entityIds.switches.adaptiveLightingLivingRoom,
          ],
        });
      },
    });
  });
}
