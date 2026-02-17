import { TServiceParams } from "@digital-alchemy/core";

export function GoingHomeService({ hass }: TServiceParams) {
  const getSpeed = async () => {
    const distance = hass.refBy.id("sensor.home_proximity_ben_distance");
    const states = await distance.history(new Date(Date.now() - 1000 * 10), new Date());

    const [first] = states;
    const [last] = states.toReversed();

    const timeDifferenceInSeconds = last.last_reported.diff(first.last_reported) / 1000;

    const distanceTravelled = Math.abs(first.state - last.state);

    return distanceTravelled / timeDifferenceInSeconds;
  };

  const getSample = async () => {
    const {
      attributes: { latitude, longitude },
    } = hass.refBy.id("person.ben");

    const { state: directionOfTravel } = hass.refBy.id(
      "sensor.home_proximity_ben_direction_of_travel",
    );

    const { state: distanceFromHome } = hass.refBy.id("sensor.home_proximity_ben_distance");

    const speedInMetersPerSecond = await getSpeed();

    return {
      timestamp: Date.now(),
      latitude,
      longitude,
      directionOfTravel,
      distanceFromHome,
      speedInMetersPerSecond,
    };
  };
  return { getSample };
}
