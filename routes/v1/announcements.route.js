const express = require("express");
const announcementControllers = require("../../controllers/announcements.controller");

const router = express.Router();

router.route("/").get(announcementControllers.getAllAnnouncements);

router.route("/addAnnouncement").post(announcementControllers.addAnnouncement);

router.get(
  "/getAnnouncement/organizationId/:organizationId",
  announcementControllers.getAnnouncementsByOrganization
);

router.put(
  "/makeAsRead/announcementId/:announcementId",
  announcementControllers.markAnnouncementAsRead
);

router.put(
  "/makeAsRemove/announcementId/:announcementId",
  announcementControllers.markAnnouncementAsRemoved
);

module.exports = router;
