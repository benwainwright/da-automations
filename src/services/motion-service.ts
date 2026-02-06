import { TServiceParams } from "@digital-alchemy/core";

export function MotionService({ hass }: TServiceParams) {
  const bedroom = hass.refBy.id("binary_sensor.bedroom_occupancy");
  const hallway = hass.refBy.id("binary_sensor.hallway_occupancy");
  const livingRoom = hass.refBy.id("binary_sensor.living_room_occupancy");
  const bathroom = hass.refBy.id("binary_sensor.bathroom_occupancy");

  const onBedroom = (callback: () => void | Promise<void>) => bedroom.onUpdate(callback);
  const onHallway = (callback: () => void | Promise<void>) => hallway.onUpdate(callback);
  const onLivingRoom = (callback: () => void | Promise<void>) => livingRoom.onUpdate(callback);
  const onBathroom = (callback: () => void | Promise<void>) => bathroom.onUpdate(callback);

  const anywhere = (callback: () => void | Promise<void>) => {
    bedroom.onUpdate(callback);
    hallway.onUpdate(callback);
    livingRoom.onUpdate(callback);
    bathroom.onUpdate(callback);
  };

  return {
    bedroom: onBedroom,
    livingRoom: onLivingRoom,
    bathroom: onBathroom,
    hallway: onHallway,
    anywhere,
  };
}
