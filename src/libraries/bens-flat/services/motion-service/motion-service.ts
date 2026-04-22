import { TServiceParams } from "@digital-alchemy/core";

export function MotionService({ hass, bens_flat: { entityIds } }: TServiceParams) {
  const bedroom = hass.refBy.id(entityIds.binarySensor.bedroomOccupancy);
  const hallway = hass.refBy.id(entityIds.binarySensor.hallwayOccupancy);
  const livingRoom = hass.refBy.id(entityIds.binarySensor.livingRoomOccupancy);
  const bathroom = hass.refBy.id(entityIds.binarySensor.bathroomOccupancy);
  const spareRoom = hass.refBy.id(entityIds.binarySensor.spareRoomOccupancy);

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
