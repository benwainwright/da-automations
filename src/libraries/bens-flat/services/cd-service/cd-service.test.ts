import { expect, mock, test } from "bun:test";
import { EntityIdService } from "../entity-service/entity-service.ts";
import { CdService } from "./cd-service.ts";

const createScene = () => ({
  toggle: mock(() => ({
    off: mock(async () => {}),
    on: mock(async () => {}),
  })),
});

test("plays boop announcement when the front door opens in CD mode", async () => {
  let doorOpenListener:
    | ((newState: { state: string }, oldState: { state: string }) => Promise<void>)
    | undefined;
  const playLocalMp3 = mock(async () => {});

  CdService({
    context: {},
    hass: {
      refBy: {
        id: (entityId: string) => {
          expect(entityId).toBe("binary_sensor.front_door_open");
          return {
            onUpdate: (
              callback: (newState: { state: string }, oldState: { state: string }) => Promise<void>,
            ) => {
              doorOpenListener = callback;
            },
          };
        },
      },
    },
    synapse: {
      switch: mock(() => ({
        is_on: true,
        onTurnOff: mock(() => {}),
        onTurnOn: mock(() => {}),
      })),
    },
    bens_flat: {
      entityIds: EntityIdService(),
      mediaPlayer: { playLocalMp3 },
      motion: {
        bedroom: mock(() => {}),
        spareRoom: mock(() => {}),
      },
      notify: {
        notifyCritical: mock(async () => {}),
      },
      scene: createScene(),
    },
  } as any);

  await doorOpenListener?.({ state: "on" }, { state: "off" });

  expect(playLocalMp3).toHaveBeenCalledWith({
    file: "boop.mp3",
    player: "media_player.whole_flat",
  });
});

test("sends a critical notification when bedroom or spare room motion fires in CD mode", async () => {
  let bedroomMotion: (() => Promise<void>) | undefined;
  let spareRoomMotion: (() => Promise<void>) | undefined;
  const notifyCritical = mock(async () => {});

  CdService({
    context: {},
    hass: {
      refBy: {
        id: () => ({
          onUpdate: mock(() => {}),
        }),
      },
    },
    synapse: {
      switch: mock(() => ({
        is_on: true,
        onTurnOff: mock(() => {}),
        onTurnOn: mock(() => {}),
      })),
    },
    bens_flat: {
      entityIds: EntityIdService(),
      mediaPlayer: { playLocalMp3: mock(async () => {}) },
      motion: {
        bedroom: (callback: () => Promise<void>) => {
          bedroomMotion = callback;
        },
        spareRoom: (callback: () => Promise<void>) => {
          spareRoomMotion = callback;
        },
      },
      notify: {
        notifyCritical,
      },
      scene: createScene(),
    },
  } as any);

  await bedroomMotion?.();
  await spareRoomMotion?.();

  expect(notifyCritical).toHaveBeenCalledTimes(2);
  expect(notifyCritical).toHaveBeenCalledWith({
    message: "someone is out of bounds",
    title: "alert",
  });
});
