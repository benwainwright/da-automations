import { TServiceParams } from "@digital-alchemy/core";

export function MotionService({ hass }: TServiceParams) {
  const bedroom = hass.refBy.id("binary_sensor.bedroom_occupancy");
  const hallway = hass.refBy.id("binary_sensor.hallway_occupancy");
  const livingRoom = hass.refBy.id("binary_sensor.living_room_occupancy");
  const bathroom = hass.refBy.id("binary_sensor.bathroom_occupancy");
  const spareRoom = hass.refBy.id("binary_sensor.spare_room_occupancy");

  const onBedroom = (callback: () => void | Promise<void>) =>
    bedroom.onUpdate(async (newState) => {
      if (newState?.state === "on") {
        await callback();
      }
    });

  const onSpareRoom = (callback: () => void | Promise<void>) =>
    spareRoom.onUpdate(async (newState) => {
      if (newState?.state === "on") {
        await callback();
      }
    });

  const onHallway = (callback: () => void | Promise<void>) =>
    hallway.onUpdate(async (newState) => {
      if (newState?.state === "on") {
        await callback();
      }
    });
  const onLivingRoom = (callback: () => void | Promise<void>) =>
    livingRoom.onUpdate(async (newState) => {
      if (newState?.state === "on") {
        await callback();
      }
    });
  const onBathroom = (callback: () => void | Promise<void>) =>
    bathroom.onUpdate(async (newState) => {
      if (newState?.state === "on") {
        await callback();
      }
    });

  const anywhere = (callback: () => void | Promise<void>) => {
    onBedroom(callback);
    onHallway(callback);
    onLivingRoom(callback);
    onBathroom(callback);
    onSpareRoom(callback);
  };

  return {
    bedroom: onBedroom,
    livingRoom: onLivingRoom,
    bathroom: onBathroom,
    hallway: onHallway,
    spareRoom: onSpareRoom,
    anywhere,
  };
}
