import { TShortTime } from "@digital-alchemy/automation";
import type { TOffset, TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY, RemoveCallback, TAreaId } from "@digital-alchemy/hass";

export function HelpersService({ hass, scheduler }: TServiceParams) {
  const allAreas: TAreaId[] = ["bathroom", "bedroom", "hallway", "living_room", "spare_room"];

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

  /**
   * Returns two functions, a 'trigger' (will execute the callback once only until 'reset' is called)
   *
   * @param callback - Callback to be executed
   * @param start - If true, the callback needs to be reset before first execution
   */
  const latch = (callback: () => void | Promise<void>, start = false) => {
    let triggered = start;

    const trigger = async () => {
      if (triggered) {
        return;
      }
      triggered = true;
      await callback();
    };

    const reset = async () => {
      triggered = false;
    };

    return { trigger, reset };
  };

  return {
    turnOffAll,
    turnOnAll,
    allAreas,
    fiveAm,
    setDebouncedTimeout,
    latch,
  };
}
