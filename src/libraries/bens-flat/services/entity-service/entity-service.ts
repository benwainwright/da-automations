import { PICK_ENTITY } from "@digital-alchemy/hass";

export function EntityIdService() {
  const blinds = {
    livingRoom: "cover.living_room_blinds",
  } satisfies Record<string, PICK_ENTITY<"cover">>;

  const sensor = {
    electricityMeter: "sensor.electricity_meter",
  } satisfies Record<string, PICK_ENTITY<"sensor">>;

  const switches = {
    boilerMainElement: "switch.boiler_main_element",
    boilerBoost: "switch.boiler_boost_switch",
    autoplayMusic: "switch.autoplay_music",
    adaptiveLightingLivingRoom: "switch.adaptive_lighting_living_room",
    adaptiveLightingBedroom: "switch.adaptive_lighting_bedroom",
    adaptiveLightingBathroom: "switch.adaptive_lighting_bathroom",
    adaptiveLightingHallway: "switch.adaptive_lighting_hallway",
    adaptiveLightingSleepModeLivingRoom: "switch.adaptive_lighting_sleep_mode_living_room",
    adaptiveLightingSleepModeBedroom: "switch.adaptive_lighting_sleep_mode_bedroom",
    adaptiveLightingSleepModeBathroom: "switch.adaptive_lighting_sleep_mode_bathroom",
    adaptiveLightingSleepModeHallway: "switch.adaptive_lighting_sleep_mode_hallway",
    adaptiveLightingSleepModeSpareRoom: "switch.adaptive_lighting_sleep_mode_spare_room",
    bedroomMotionSensor: "switch.bedroom_motion_sensor",
  } satisfies Record<string, PICK_ENTITY<"switch">>;

  const scene = {
    /**
     * Scene configured in Home Assistant to turn bass on all speakers down
     */
    nightAuto: "scene.night_audio",
  } satisfies Record<string, PICK_ENTITY<"scene">>;

  const number = {
    bathroomSpeakerBass: "number.bathroom_bass",
    bedroomSpeakerBass: "number.bedroom_speaker_bass",
    livingRoomSpeakerBass: "number.living_room_bass",
    hallwaySpeakerBass: "number.hallway_bass",
  } satisfies Record<string, PICK_ENTITY<"number">>;

  const tts = {
    openAiGpt4: "tts.openai_tts_gpt_40",
    homeAssistantCloud: "tts.home_assistant_cloud",
  } satisfies Record<string, PICK_ENTITY<"tts">>;

  const zone = {
    home: "zone.home",
  } satisfies Record<string, PICK_ENTITY<"zone">>;

  const mediaPlayers = {
    wholeFlat: "media_player.whole_flat",
    bedroomSonos: "media_player.bedroom_sonos_one",
    appleTv: "media_player.apple_tv",
    tv: "media_player.tv",
  } satisfies Record<string, PICK_ENTITY<"media_player">>;

  const weather = {
    home: "weather.home",
  } satisfies Record<string, PICK_ENTITY<"weather">>;

  const calendar = {
    personalCalendar: "calendar.personal_calendar",
  } satisfies Record<string, PICK_ENTITY<"calendar">>;

  const plant = {
    marlin: "plant.marlin",
    monroe: "plant.monroe",
  } satisfies Record<string, PICK_ENTITY<"plant">>;

  const binarySensor = {
    livingRoomOccupancy: "binary_sensor.living_room_occupancy",
    hallwayOccupancy: "binary_sensor.hallway_occupancy",
    spareRoomOccupancy: "binary_sensor.spare_room_occupancy",
    bedroomOccupancy: "binary_sensor.bedroom_occupancy",
    bathroomOccupancy: "binary_sensor.bathroom_occupancy",
  } satisfies Record<string, PICK_ENTITY<"binary_sensor">>;

  const lock = {
    frontDoor: "lock.front_door",
  } satisfies Record<string, PICK_ENTITY<"lock">>;

  return {
    blinds,
    switches,
    mediaPlayers,
    weather,
    calendar,
    plant,
    binarySensor,
    lock,
    tts,
    zone,
    scene,
    number,
    sensor,
  };
}
