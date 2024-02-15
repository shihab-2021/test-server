const express = require("express");
const notificationControllers = require("../../controllers/notifications.controller");

const router = express.Router();

router.route("/").get(notificationControllers.getAllNotifications);

router.route("/addNotification").post(notificationControllers.addNotification);

router
  .route("/getNotification/userEmail/:userEmail")
  .get(notificationControllers.getUserNotifications);

router
  .route("/makeAsRead/notificationId/:notificationId")
  .put(notificationControllers.markNotificationAsRead);

module.exports = router;
