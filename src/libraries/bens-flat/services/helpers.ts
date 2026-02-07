import { TShortTime } from "@digital-alchemy/automation";
import type { TOffset, TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY, RemoveCallback, TAreaId } from "@digital-alchemy/hass";

export function HelpersService({ hass, scheduler }: TServiceParams) {
  const allAreas: TAreaId[] = ["bathroom", "bathroom", "bedroom", "hallway", "living_room"];

  const fiveAm: TShortTime = "AM5:00";

  const turnOffAll = async (switches: PICK_ENTITY<"switch" | "light">[]) => {
    await Promise.all(
      switches.map(hass.refBy.id).map(async (theThing) => await theThing.turn_off()),
    );
  };

  const turnOnAll = async (switches: PICK_ENTITY<"switch" | "light">[]) => {
    await Promise.all(
      switches.map(hass.refBy.id).map(async (theThing) => await theThing.turn_on()),
    );
  };

  let clear: RemoveCallback | undefined;
  const setDebouncedTimeout = (callback: () => void | Promise<void>, offset: TOffset) => {
    clear?.remove();
    clear = scheduler.setTimeout(callback, offset);
  };

  return {
    turnOffAll,
    turnOnAll,
    allAreas,
    fiveAm,
    setDebouncedTimeout,
  };
}
