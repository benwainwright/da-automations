import { CronExpression, type TServiceParams } from "@digital-alchemy/core";
import type { PICK_ENTITY } from "@digital-alchemy/hass";
import { FIVE_AM, THREE_PM } from "../constants.ts";
import { mdi } from "../icons.ts";

export function SleepModeService({
  hass,
  context,
  synapse,
  scheduler,
  bens_flat: {
    helpers,
    lights,
    motion,
    visitor,
    entityIds,
    alarm,
    briefing,
    tvMode,
    cd,
    presence,
    iMac,
  },
  logger,
  automation: { time },
}: TServiceParams) {
  const sleepMode = synapse.switch({
    name: "Night Mode",
    context,
    icon: mdi.sleep,
    unique_id: "sleep_mode_switch",
    suggested_object_id: "sleep_mode",
  });

  const sleepModeIsOn = () => {
    const sleepModeState = Boolean(sleepMode.is_on);
    logger.info(`Checking sleep mode is on: ${sleepModeState}`);
    return sleepModeState;
  };

  motion.anywhere(async () => {
    if (
      presence.flatIsOccupied() &&
      briefing.remindersSwitch.is_on &&
      !sleepModeIsOn() &&
      time.isAfter("PM01:30") &&
      time.isBefore("PM09:00") &&
      !tvMode.isOn() &&
      !cd.cdSwitch.is_on
    ) {
      await briefing.todoList();
    }
  });

  hass.socket.onEvent({
    context,
    event: "sleep_mode_event",
    async exec() {
      const sleepModeEntity = sleepMode.getEntity();
      if (!sleepModeEntity) {
        logger.warn(`Skipping sleep mode event; entity is unavailable`);
        return;
      }

      await sleepModeEntity.turn_on();
    },
  });

  const adaptiveLightingSleepModeSwitches: PICK_ENTITY<"switch">[] = [
    entityIds.switches.adaptiveLightingSleepModeBathroom,
    entityIds.switches.adaptiveLightingSleepModeBedroom,
    entityIds.switches.adaptiveLightingSleepModeHallway,
    entityIds.switches.adaptiveLightingSleepModeLivingRoom,
    entityIds.switches.adaptiveLightingSleepModeSpareRoom,
  ];

  sleepMode.onTurnOn(async () => {
    await hass.call.switch.turn_off({ entity_id: entityIds.switches.bedroomMotionSensor });
    await Promise.allSettled([
      helpers.turnOnAll(adaptiveLightingSleepModeSwitches),
      hass.call.switch.turn_off({ entity_id: entityIds.switches.autoplayMusic }),
      alarm.setForFirstEventOfNextDay(),
      iMac.shutdown(),
    ]);
    await lights.turnOffAll();
  });

  sleepMode.onTurnOff(async () => {
    await helpers.turnOffAll(adaptiveLightingSleepModeSwitches);
    const visitorModeEntity = visitor?.visitorMode?.getEntity?.();
    const visitorModeIsOn = visitorModeEntity?.state === "on";

    const visitorModeIsOffAndTimeIsBetweenFiveAmAndThreePm =
      time.isAfter(FIVE_AM) && !visitorModeIsOn && time.isBefore(THREE_PM);

    if (visitorModeIsOffAndTimeIsBetweenFiveAmAndThreePm) {
      const briefingWasRead = await briefing.read();
      if (!briefingWasRead) {
        return;
      }
      await Promise.allSettled([
        hass.call.switch.turn_on({ entity_id: entityIds.switches.bedroomMotionSensor }),
        hass.call.switch.turn_on({ entity_id: entityIds.switches.autoplayMusic }),
      ]);
    }
  });

  const morningTrigger = async () => {
    const sleepModeEntity = sleepMode.entity_id;
    const visitorModeEntity = visitor?.visitorMode?.getEntity?.();
    const visitorModeIsOn = visitorModeEntity?.state === "on";

    const sleepModeIsOnVisitorModeIsOffAndTimeIsBetweenFiveAmAndThreePm =
      time.isAfter(FIVE_AM) && sleepModeEntity && !visitorModeIsOn && time.isBefore(THREE_PM);

    if (sleepModeIsOnVisitorModeIsOffAndTimeIsBetweenFiveAmAndThreePm) {
      await hass.call.switch.turn_off({ entity_id: sleepModeEntity });
    }
  };

  scheduler.cron({
    schedule: CronExpression.EVERY_DAY_AT_5AM,
    exec: briefing.reset,
  });

  motion.livingRoom(morningTrigger);

  return { sleepModeSwitch: sleepMode, isOn: sleepModeIsOn };
}
