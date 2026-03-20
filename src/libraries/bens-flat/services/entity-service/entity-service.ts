import { PICK_ENTITY } from "@digital-alchemy/hass";

export function EntityIdService() {
  const blinds = {
    livingRoom: "cover.living_room_blinds",
  } satisfies Record<string, PICK_ENTITY<"cover">>;

  const switches = {
    boilerMainElement: "switch.boiler_main_element",
    boilerBoost: "switch.boiler_boost_switch",
  } satisfies Record<string, PICK_ENTITY<"switch">>;

  const mediaPlayers = {
    wholeFlat: "media_player.whole_flat",
  } satisfies Record<string, PICK_ENTITY<"media_player">>;

  const weather = {
    home: "weather.home",
  } satisfies Record<string, PICK_ENTITY<"weather">>;

  const calendar = {
    personalCalendar: "calendar.personal_calendar",
  } satisfies Record<string, PICK_ENTITY<"calendar">>;

  return { blinds, switches, mediaPlayers, weather, calendar };
}
