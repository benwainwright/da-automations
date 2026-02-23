import { beforeEach, expect, mock, test } from "bun:test";
import type { PICK_ENTITY } from "@digital-alchemy/hass";
import { MusicPlayer } from "./music-player.ts";

type PlayerUpdateCallback = (
  newState?: { state: string },
  oldState?: { state: string },
) => Promise<void> | void;

type EntityState = {
  state: string;
  play_media?: (config: unknown) => Promise<void>;
  volume_set?: (config: unknown) => Promise<void>;
  media_pause?: () => Promise<void>;
  onUpdate?: (callback: PlayerUpdateCallback) => void;
};

const makeHarness = (config?: {
  wholeFlatState?: string;
  autoplayState?: "on" | "off";
  sleepModeState?: "on" | "off";
  tvModeState?: "on" | "off";
  libraryItems?: Array<{ uri: string; media_type: string }>;
}) => {
  const playMedia = mock(async (_config: unknown) => {});
  const volumeSet = mock(async (_config: unknown) => {});
  const mediaPause = mock(async () => {});
  const removeTimeout = mock(() => {});
  const setTimeout = mock((callback: () => void | Promise<void>, _offset: unknown) => ({
    callback,
    remove: removeTimeout,
  }));
  const getLibrary = mock(async () => ({
    items: config?.libraryItems ?? [{ uri: "playlist://morning", media_type: "playlist" }],
  }));
  let playerUpdateCallback: PlayerUpdateCallback | undefined;

  const entities = new Map<string, EntityState>([
    [
      "media_player.whole_flat",
      {
        state: config?.wholeFlatState ?? "idle",
        play_media: playMedia,
        volume_set: volumeSet,
        media_pause: mediaPause,
        onUpdate: (callback) => {
          playerUpdateCallback = callback;
        },
      },
    ],
    ["switch.autoplay_music", { state: config?.autoplayState ?? "on" }],
    ["switch.sleep_mode", { state: config?.sleepModeState ?? "off" }],
    ["switch.tv_mode", { state: config?.tvModeState ?? "off" }],
  ]);

  const hass = {
    refBy: {
      id: (id: string) => {
        const entity = entities.get(id);
        if (!entity) {
          throw new Error(`Missing entity: ${id}`);
        }
        return entity;
      },
    },
    call: {
      music_assistant: {
        get_library: getLibrary,
      },
    },
  };

  const player = new MusicPlayer({
    hass: hass as any,
    scheduler: { setTimeout } as any,
    logger: { info: mock(() => {}), trace: mock(() => {}) } as any,
    mediaPlayer: "media_player.whole_flat" as PICK_ENTITY<"media_player">,
    playerOnSwitch: "switch.autoplay_music" as PICK_ENTITY<"switch">,
    blockIfOn: ["switch.sleep_mode", "switch.tv_mode"] as PICK_ENTITY<"switch">[],
    pauseAutoplayFor: [5, "minute"],
  });

  return {
    player,
    getLibrary,
    playMedia,
    volumeSet,
    mediaPause,
    setTimeout,
    emitPlayerUpdate: async (newState: string, oldState: string) => {
      await playerUpdateCallback?.({ state: newState }, { state: oldState });
    },
  };
};

beforeEach(() => {
  mock.clearAllMocks();
});

test("onMotionInFlat plays a random playlist when autoplay is on and unblocked", async () => {
  const harness = makeHarness();

  await harness.player.onMotionInFlat();

  expect(harness.getLibrary).toHaveBeenCalledTimes(1);
  expect(harness.volumeSet).toHaveBeenCalledWith({ volume_level: 0.3 });
  expect(harness.playMedia).toHaveBeenCalledWith({
    media_content_id: "playlist://morning",
    media_content_type: "playlist",
  });
});

test("onMotionInFlat does not play while whole-flat player is already playing", async () => {
  const harness = makeHarness({ wholeFlatState: "playing" });

  await harness.player.onMotionInFlat();

  expect(harness.getLibrary).not.toHaveBeenCalled();
  expect(harness.playMedia).not.toHaveBeenCalled();
});

test("onMotionInFlat does not play when autoplay switch is off", async () => {
  const harness = makeHarness({ autoplayState: "off" });

  await harness.player.onMotionInFlat();

  expect(harness.getLibrary).not.toHaveBeenCalled();
  expect(harness.playMedia).not.toHaveBeenCalled();
});

test("onMotionInFlat does not play when a blocking switch is on", async () => {
  const harness = makeHarness({ tvModeState: "on" });

  await harness.player.onMotionInFlat();

  expect(harness.getLibrary).not.toHaveBeenCalled();
  expect(harness.playMedia).not.toHaveBeenCalled();
});

test("playing->idle event disables autoplay until configured interval ends", async () => {
  const harness = makeHarness();

  await harness.emitPlayerUpdate("idle", "playing");
  await harness.player.onMotionInFlat();
  expect(harness.playMedia).not.toHaveBeenCalled();
  expect(harness.setTimeout.mock.calls.at(-1)?.[1]).toEqual([5, "minute"]);

  const timeoutCallback = harness.setTimeout.mock.calls.at(-1)?.[0] as (() => void) | undefined;
  expect(timeoutCallback).toBeDefined();
  timeoutCallback?.();

  await harness.player.onMotionInFlat();
  expect(harness.playMedia).toHaveBeenCalledTimes(1);
});

test("repeated playing->idle events restart the autoplay disable interval", async () => {
  const harness = makeHarness();

  await harness.emitPlayerUpdate("idle", "playing");
  await harness.emitPlayerUpdate("idle", "playing");

  expect(harness.setTimeout).toHaveBeenCalledTimes(2);
  const firstTimer = harness.setTimeout.mock.results[0]?.value as
    | { remove: () => void }
    | undefined;
  const firstRemove = firstTimer?.remove;
  expect(firstRemove).toHaveBeenCalledTimes(1);
});

test("pause() pauses the whole-flat media player", async () => {
  const harness = makeHarness();

  await harness.player.pause();

  expect(harness.mediaPause).toHaveBeenCalledTimes(1);
});
