import { type TServiceParams } from "@digital-alchemy/core";
import { RemoveCallback } from "@digital-alchemy/hass";

export function CoreModule({
  bens_flat,
  lifecycle,
  scheduler,
  auto_deploy,
  logger,
}: TServiceParams) {
  const { lights, sleepMode, tvMode, presence, blinds, notify } = bens_flat;
  lifecycle.onReady(async () => {
    const autoDeployNotificationId = "auto_deploy_status";
    const autoDeployNotificationTitle = "Auto Deploy";

    await notify.replacePersistentNotificationIfExists({
      notificationId: autoDeployNotificationId,
      title: autoDeployNotificationTitle,
      message: "Automation application restarted after deploy.",
    });

    // Keep auto-deploy status messaging in core without coupling auto-deploy to flat-specific services.
    auto_deploy?.lifecycle?.listen(async (event) => {
      if (event.type === "deploy.started") {
        await notify.replacePersistentNotification({
          notificationId: autoDeployNotificationId,
          title: autoDeployNotificationTitle,
          message: "Deploy triggered. Pulling and building latest automation code.",
        });
      }

      if (event.type === "restart.requested") {
        await notify.replacePersistentNotification({
          notificationId: autoDeployNotificationId,
          title: autoDeployNotificationTitle,
          message: "Deploy finished. Restarting automation application now.",
        });
      }
    });

    const tvModeEntityId = tvMode.tvModeSwitch.entity_id;
    lights.setupMotionTrigger({
      switchName: "Living room motion sensor",
      area: "living_room",
      sensorId: "binary_sensor.living_room_occupancy",
      ...(tvModeEntityId ? { blockSwitches: [tvModeEntityId] } : {}),
      timeout: "30m",
    });
    if (!tvModeEntityId) {
      logger.warn(`TV mode switch entity is unavailable; living room block switch disabled`);
    }

    lights.setupMotionTrigger({
      switchName: "Hallway motion sensor",
      area: "hallway",
      sensorId: "binary_sensor.hallway_occupancy",
      timeout: "2m",
    });

    lights.setupMotionTrigger({
      switchName: "Spare room motion sensor",
      area: "spare_room",
      sensorId: "binary_sensor.spare_room_occupancy",
      timeout: "5m",
    });

    const sleepModeEntityId = sleepMode.sleepModeSwitch.getEntity()?.entity_id;
    lights.setupMotionTrigger({
      switchName: "Bedroom motion sensor",
      area: "bedroom",
      ...(sleepModeEntityId ? { blockSwitches: [sleepModeEntityId] } : {}),
      sensorId: "binary_sensor.bedroom_occupancy",
      timeout: "10m",
    });
    if (!sleepModeEntityId) {
      logger.warn(`Sleep mode switch entity is unavailable; bedroom block switch disabled`);
    }

    lights.setupMotionTrigger({
      switchName: "Bathroom motion sensor",
      area: "bathroom",
      sensorId: "binary_sensor.bathroom_occupancy",
      timeout: "2m",
    });

    const flatIsOccupiedEntity = presence.flatIsOccupiedSwitch.getEntity();
    if (!flatIsOccupiedEntity) {
      logger.warn(`Flat occupancy switch entity is unavailable; occupancy reactions disabled`);
      return;
    }

    flatIsOccupiedEntity.onUpdate(async (newState, oldState) => {
      if (!newState) return;
      if (oldState.state === "on" && newState.state === "off") {
        await lights.turnOffAll();
        await blinds.close();
      } else if (oldState.state === "off" && newState.state === "on") {
        await blinds.openIfDefaultIsOpen();
      }
    });

    let schedulerCallback: RemoveCallback | undefined;

    const tvModeEntity = tvMode.tvModeSwitch.getEntity();
    if (!tvModeEntity) {
      logger.warn(`TV mode switch entity is unavailable; blind sync disabled`);
      return;
    }

    tvModeEntity.onUpdate(async (newState, oldState) => {
      if (!newState) return;
      if (oldState.state === "off" && newState.state === "on") {
        schedulerCallback?.remove();
        await blinds.close();
      } else if (oldState.state === "on" && newState.state === "off") {
        schedulerCallback = scheduler.setTimeout(() => {}, "5m");
        await blinds.openIfDefaultIsOpen();
      }
    });
  });
}
