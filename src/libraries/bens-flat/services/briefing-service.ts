import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";
import dayjs from "dayjs";

interface CalendarEvent {
  start: string;
  end: string;
  summary: string;
  location?: string;
}

type GetCalendarResponse<TCalendar extends PICK_ENTITY<"calendar">> = {
  [K in TCalendar]: {
    events: CalendarEvent[];
  };
};

interface TodoItem {
  summary: string;
  status: string;
  uuid: string;
  due?: string;
}

type GetTodoItemsResponse<TTodoList extends PICK_ENTITY<"todo"> = PICK_ENTITY<"todo">> = {
  [K in TTodoList]: {
    items: TodoItem[];
  };
};

export function BriefingService({
  hass,
  synapse,
  context,
  bens_flat: { notify },
  logger,
}: TServiceParams) {
  const triggerBriefing = synapse.button({
    unique_id: "trigger-briefing",
    name: "Briefing",
    context,
  });

  function degreesToCompass(degrees: number): string {
    const directions = [
      "north",
      "north-east",
      "east",
      "south-east",
      "south",
      "south-west",
      "west",
      "north-west",
    ];

    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  const formatWeatherForSpeech = (weather: PICK_ENTITY<"weather">) => {
    const { state, attributes } = hass.refBy.id(weather);

    const temperature = Math.round(attributes.temperature);
    const windSpeed = Math.round(attributes.wind_speed);
    const windDirection = degreesToCompass(attributes.wind_bearing);

    return `The weather in Manchester is ${state} and ${temperature} degrees, with ${windDirection} winds at ${windSpeed} kilometres per hour.`;
  };

  const getDateAndTimeString = () => {
    const now = dayjs();

    const getOrdinal = (day: number) => {
      if (day > 3 && day < 21) return "th";
      switch (day % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    const time = now.format("h:mm A");
    const day = now.format("dddd");
    const dateNumber = now.date();
    const month = now.format("MMMM");

    return `The time is ${time} on ${day} the ${dateNumber}${getOrdinal(dateNumber)} of ${month}.`;
  };

  const getTodoListString = async () => {
    const today = dayjs();
    const items = Object.values(
      await hass.call.todo.get_items<GetTodoItemsResponse>({
        entity_id: [
          "todo.admin",
          "todo.domestic",
          "todo.health",
          "todo.hobbies",
          "todo.inbox",
          "todo.personal",
          "todo.personal",
          "todo.shopping_list",
          "todo.social",
          "todo.wishlist",
        ],
      }),
    )
      .flatMap((item) => item.items)
      .filter((item) => {
        if (!item.due) return false;

        return dayjs(item.due).isSame(today, "day") || dayjs(item.due).isBefore(today);
      });

    const countString = `You have ${items.length} items in your todo list: `;

    const itemsString = items.map((item) => item.summary).join(", ");

    if (items.length === 0) {
      return `You have nothing in your todo list`;
    }

    return `${countString} ${itemsString}`;
  };

  const getReadCalendarString = async () => {
    const startOfToday = dayjs().startOf("day").toISOString();
    const endOfToday = dayjs().endOf("day").toISOString();
    const events = await hass.call.calendar.get_events<
      GetCalendarResponse<"calendar.personal_calendar">
    >({
      entity_id: "calendar.personal_calendar",
      start_date_time: startOfToday,
      end_date_time: endOfToday,
    });

    const readString = events["calendar.personal_calendar"].events
      .map((event) => `${event.summary} at ${dayjs(event.start).format("h:mma")}`)
      .join(", ");

    return `You currently have ${events["calendar.personal_calendar"].events.length} events in your calendar: ${readString}`;
  };

  const readBriefing = async () => {
    logger.info(`Triggering briefing`);

    const briefingStringParts = [
      `Good morning!`,
      getDateAndTimeString(),
      formatWeatherForSpeech("weather.home"),
      await getReadCalendarString(),
      await getTodoListString(),
    ];

    await notify.speak(briefingStringParts.join(" "));
  };

  triggerBriefing.onPress(async () => {
    await readBriefing();
  });

  return { read: readBriefing };
}
