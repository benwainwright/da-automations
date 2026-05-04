import { type TServiceParams } from "@digital-alchemy/core";

export function CoreModule({ bens_flat, lifecycle, auto_deploy }: TServiceParams) {
  const { lights, presence, blinds, notify, entityIds, tvMode, sleepMode } = bens_flat;

  lifecycle.onReady(async () => {
    const autoDeployNotificationId = "auto_deploy_status";
    const autoDeployNotificationTitle = "Auto Deploy";

    await notify.replacePersistentNotificationIfExists({
      notificationId: autoDeployNotificationId,
      title: autoDeployNotificationTitle,
      message: "Automation application restarted after deploy.",
    });

    auto_deploy?.lifecycle?.listen(async (event) => {
      if (event.type === "deploy.started") {
        await notify.replacePersistentNotification({
          notificationId: autoDeployNotificationId,
          title: autoDeployNotificationTitle,
          message: "Deploy triggered. Pulling and building latest automation code...",
        });
      }

      if (event.type === "restart.requested") {
        await notify.replacePersistentNotification({
          notificationId: autoDeployNotificationId,
          title: autoDeployNotificationTitle,
          message: "Deploy finished. Restarting automation application now...",
        });
      }
    });

    presence.flatIsOccupiedSwitch.onUpdate(async (newState, oldState) => {
      if (!newState || !oldState) return;
      if (oldState.state === "on" && newState.state === "off") {
        await Promise.allSettled([lights.turnOffAll(), blinds.close()]);
      } else if (oldState.state === "off" && newState.state === "on") {
        await blinds.openIfDefaultIsOpen();
      }
    });
  });

  // Only set up motion triggers when entityIds are available (not required in tests)
  const sensors = entityIds?.binarySensor;
  if (sensors) {
    lights.setupMotionTrigger({
      switchName: "Living room motion sensor",
      area: "living_room",
      sensorId: sensors.livingRoomOccupancy,
      blockSwitches: [() => tvMode.tvModeSwitch.entity_id],
      timeout: "30m",
    });

    lights.setupMotionTrigger({
      switchName: "Hallway motion sensor",
      area: "hallway",
      sensorId: sensors.hallwayOccupancy,
      timeout: "2m",
    });

    lights.setupMotionTrigger({
      switchName: "Spare room motion sensor",
      area: "spare_room",
      sensorId: sensors.spareRoomOccupancy,
      timeout: "5m",
    });

    lights.setupMotionTrigger({
      switchName: "Bedroom motion sensor",
      area: "bedroom",
      blockSwitches: [() => sleepMode.sleepModeSwitch.entity_id],
      sensorId: sensors.bedroomOccupancy,
      timeout: "10m",
    });

    lights.setupMotionTrigger({
      switchName: "Bathroom motion sensor",
      area: "bathroom",
      sensorId: sensors.bathroomOccupancy,
      timeout: "2m",
    });
  }
}
