import { type TOffset, TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

interface LibraryItem {
  media_type: string;
  uri: string;
  name: string;
  image: string;
  favourite: boolean;
}

interface AutomaticMusicPlayerConfig {
  mediaPlayer: PICK_ENTITY<"media_player">;
  playerOnSwitch: PICK_ENTITY<"switch">;
  blockIfOn: PICK_ENTITY<"switch">[];
  pauseAutoplayFor: TOffset;
  hass: TServiceParams["hass"];
  scheduler: TServiceParams["scheduler"];
  logger: TServiceParams["logger"];
  controller: IMusicPlayer;
}

interface PlayConfig {
  type: string;
  id: string;
  player: PICK_ENTITY<"media_player">;
  enqueue?: string;
  volume?: number;
  announce?: boolean;
}

export interface IMusicPlayer {
  play(config: PlayConfig): Promise<void>;
}

export class MusicPlayer {
  private autoplayPaused = false;

  private pauseAutoplayTimeout?: { remove: () => void };

  public constructor(private readonly config: AutomaticMusicPlayerConfig) {
    this.setupPauseEventLockout();
  }

  public async onMotionInFlat() {
    this.config.logger.trace(`Motion detected in flat`);
    const wholeFlatPlayer = this.config.hass.refBy.id(this.config.mediaPlayer);
    const autoplaySwitch = this.config.hass.refBy.id(this.config.playerOnSwitch);

    if (
      wholeFlatPlayer.state === "playing" ||
      autoplaySwitch.state !== "on" ||
      this.autoplayPaused
    ) {
      return;
    }

    const blocked = this.config.blockIfOn.some((switchId) => {
      const entity = this.config.hass.refBy.id(switchId);
      return entity.state === "on";
    });

    if (blocked) {
      return;
    }

    this.config.logger.info(`Autoplay is on, playing some background music`);
    await this.playRandomFavouritePlaylist();
  }

  private async playRandomFavouritePlaylist() {
    this.config.logger.info(`Playing music`);
    const result = await this.config.hass.call.music_assistant.get_library<{
      items: LibraryItem[];
    }>({
      favorite: true,
      media_type: "playlist",
      /* cspell:disable-next-line */
      config_entry_id: "01KGQT8ZJWTVX9DXC1KEFG8FG8",
      order_by: "random_play_count",
    });
    const [first] = result.items;

    this.config.logger.info(`Playing ${first?.name}`);

    await this.config.hass.call.media_player.shuffle_set({
      shuffle: true,
      entity_id: this.config.mediaPlayer,
    });

    if (first) {
      await this.config.controller.play({
        id: first.uri,
        type: first.media_type,
        player: this.config.mediaPlayer,
        volume: 0.3,
      });
    }
  }

  public async pause() {
    await this.config.hass.refBy.id(this.config.mediaPlayer).media_pause();
  }

  private setupPauseEventLockout() {
    const player = this.config.hass.refBy.id(this.config.mediaPlayer);

    player.onUpdate((newState, oldState) => {
      if (!newState || !oldState) {
        return;
      }
      if (!(oldState.state === "playing" && newState.state === "idle")) {
        return;
      }

      this.autoplayPaused = true;
      this.pauseAutoplayTimeout?.remove();
      this.pauseAutoplayTimeout = this.config.scheduler.setTimeout(() => {
        this.autoplayPaused = false;
      }, this.config.pauseAutoplayFor);
    });
  }
}
