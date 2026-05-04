import { TServiceParams } from "@digital-alchemy/core";

export function PodcastService({
  hass,
  synapse,
  context,
  bens_flat: { mediaPlayer, entityIds },
}: TServiceParams) {
  const getPod = synapse.button({
    name: "Play latest news podcast",
    context,
  });

  interface GetPodcastEpisodesResponse {
    episodes: {
      media_title: string;
      media_content_id: string;
      duration: number;
      media_image: string;
      favourite: boolean;
      release_date: string;
    }[];
  }

  const getLatestEpisode = async (podcastUrl: string) => {
    const results: GetPodcastEpisodesResponse = await hass.call.mass_queue.get_podcast_episodes({
      /* cspell:disable-next-line */
      config_entry_id: "01KM5ZV4PJ58R66HNJFD7V5QRT",
      uri: podcastUrl,
    });

    const [first] = results.episodes.toSorted((a, b) =>
      new Date(a.release_date) > new Date(b.release_date) ? -1 : 1,
    );

    return first;
  };

  const playLatestEpisode = async (podcastUri: string) => {
    const latestEpisode = await getLatestEpisode(podcastUri);

    await mediaPlayer.play({
      player: [
        entityIds.mediaPlayers.hallway,
        entityIds.mediaPlayers.bathroom,
        entityIds.mediaPlayers.bedroom,
        entityIds.mediaPlayers.livingRoom,
      ],
      id: latestEpisode.media_content_id,
      type: "music",
      volume: 0.5,
    });
  };

  getPod.onPress(async () => {
    await playLatestEpisode("library://podcast/3");
  });

  return { playLatestEpisode };
}
