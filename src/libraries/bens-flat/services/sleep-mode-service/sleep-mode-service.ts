import { type TServiceParams } from "@digital-alchemy/core";
import type { PICK_ENTITY } from "@digital-alchemy/hass";
import { FIVE_AM, THREE_PM } from "../constants.ts";
import dayjs from "dayjs";
import { mdi } from "../icons.ts";

export function SleepModeService({
  hass,
  context,
  synapse,
  bens_flat: { helpers, lights, motion, visitor, calendar, notify, alexa, entityIds },
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

  const setAlarmButton = synapse.button({
    unique_id: "Set alarm",
    name: "Alarm",
    icon: mdi.alarm,
    context,
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

  const setAlarm = async () => {
    const events = await calendar.getEvents({
      start: dayjs().add(1, "day").startOf("day"),
      end: dayjs().add(1, "day").endOf("day"),
    });

    const [first] = events.filter((event) => /T/.test(event.start));

    if (!first) {
      await notify.speak({
        message: `No events in calendar tomorrow. Goodnight!`,
        announce: false,
        volume: 0.5,
      });

      return;
    }

    await notify.speak({
      message: `Setting alarm for ${first.summary}`,
      announce: false,
      volume: 0.5,
    });

    const timeToSetAlarmFor = dayjs(first.start).subtract(90, "minutes").format("h:mm A");

    await alexa.command({
      player: entityIds.mediaPlayers.bedroomSonos,
      command: `Set alarm for ${timeToSetAlarmFor} tomorrow morning`,
    });
  };

  setAlarmButton.onPress(async () => {
    await setAlarm();
  });

  sleepMode.onTurnOn(async () => {
    (await lights.turnOffAll(),
      await Promise.allSettled([
        helpers.turnOnAll(adaptiveLightingSleepModeSwitches),
        hass.call.switch.turn_off({ entity_id: entityIds.switches.autoplayMusic }),
        setAlarm(),
      ]));
  });

  sleepMode.onTurnOff(async () => {
    await helpers.turnOffAll(adaptiveLightingSleepModeSwitches);
  });

  const morningTrigger = async () => {
    const sleepModeEntity = sleepMode.entity_id;
    const visitorModeEntity = visitor?.visitorMode?.getEntity?.();
    const visitorModeIsOn = visitorModeEntity?.state === "on";
    if (time.isAfter(FIVE_AM) && sleepModeEntity && !visitorModeIsOn && time.isBefore(THREE_PM)) {
      await hass.call.switch.turn_off({ entity_id: sleepModeEntity });
    }
  };

  motion.livingRoom(morningTrigger);
  motion.hallway(morningTrigger);
  motion.bathroom(morningTrigger);

  const isOn = () => {
    const sleepModeState = Boolean(sleepMode.is_on);
    logger.info(`Checking sleep mode is on: ${sleepModeState}`);
    return sleepModeState;
  };

  return { sleepModeSwitch: sleepMode, isOn };
}
