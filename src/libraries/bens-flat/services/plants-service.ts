import { TServiceParams } from "@digital-alchemy/core";
import { PICK_ENTITY } from "@digital-alchemy/hass";

export function PlantsService({ hass, bens_flat: { nags }, lifecycle }: TServiceParams) {
  const addPlantAlert = ({ plant }: { plant: PICK_ENTITY<"plant"> }) => {
    const thePlant = hass.refBy.id(plant);
    const name = thePlant.attributes.friendly_name;
    nags.add({
      trigger: () => thePlant.state === "problem",
      notification: {
        message: `Plant ${name} has a problem`,
        title: `Plant Alert`,
      },
    });
  };

  lifecycle.onReady(() => {
    addPlantAlert({
      plant: "plant.marlin",
    });

    addPlantAlert({ plant: "plant.monroe" });
  });
}
