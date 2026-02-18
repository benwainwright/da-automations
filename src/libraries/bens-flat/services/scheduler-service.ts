import { CronExpression, TServiceParams } from "@digital-alchemy/core";

export function SchedulerService({ scheduler, bens_flat: { scene } }: TServiceParams) {
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
}
