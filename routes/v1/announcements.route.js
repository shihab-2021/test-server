const express = require("express");
const announcementControllers = require("../../controllers/announcements.controller");

const router = express.Router();

router.route("/").get(announcementControllers.getAllAnnouncements);

router.route("/addAnnouncement").post(announcementControllers.addAnnouncement);

router.get(
  "/getAnnouncement/organizationId/:organizationId",
  announcementControllers.getAnnouncementsByOrganization
);

module.exports = router;
