import { TServiceParams } from "@digital-alchemy/core";
import dayjs from "dayjs";

import { mdi } from "../icons.ts";

export function AlarmService({
  synapse,
  context,
  bens_flat: { alexa, entityIds, calendar, notify },
}: TServiceParams) {
  const setAlarmButton = synapse.button({
    unique_id: "Set alarm for tomorrow",
    name: "Set Alarm",
    icon: mdi.alarm,
    suggested_object_id: "set_alarm",
    context,
  });

  const setForFirstEventOfNextDay = async () => {
    const now = dayjs();
    const targetDay = now.hour() < 5 ? now : now.add(1, "day");
    const targetCalendarDay = targetDay.isSame(now, "day") ? "today" : "tomorrow";
    const targetMorning = targetDay.isSame(now, "day") ? "this morning" : "tomorrow morning";

    const events = await calendar.getEvents({
      start: targetDay.startOf("day"),
      end: targetDay.endOf("day"),
    });

    const [first] = events.filter((event) => /T/.test(event.start));

    if (!first) {
      await notify.speak({
        message: `No events in calendar ${targetCalendarDay}. Goodnight!`,
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
      command: `Set alarm for ${timeToSetAlarmFor} ${targetMorning}`,
    });
  };

  setAlarmButton.onPress(async () => {
    await setForFirstEventOfNextDay();
  });

  return { setForFirstEventOfNextDay };
}
