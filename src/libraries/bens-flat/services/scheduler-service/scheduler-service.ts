import { CronExpression, TServiceParams } from "@digital-alchemy/core";

export function SchedulerService({ scheduler, bens_flat: { scene }, hass }: TServiceParams) {
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
