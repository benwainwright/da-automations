import { TServiceParams } from "@digital-alchemy/core";

export function PodcastService({ hass, synapse, context }: TServiceParams) {
  const getPod = synapse.button({
    name: "get pod episodes",
    context,
  });

  const getLatestEpisode = async (podcastUrl: string) => {
    const results = await hass.call.mass_queue.get_podcast_episodes({
      /* cspell:disable-next-line */
      config_entry_id: "01KM5ZV4PJ58R66HNJFD7V5QRT",
      uri: podcastUrl,
    });

    console.log(JSON.stringify(results, null, 2));
  };

  getPod.onPress(async () => {
    await getLatestEpisode("library://podcast/3");
  });
}
