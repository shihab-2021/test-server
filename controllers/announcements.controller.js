const { ObjectId } = require("mongodb");
const client = require("../utils/dbConnect");
const announcementCollection = client
  .db("experiment-labs")
  .collection("announcements");
const { getIo } = require("../socketSetup");
const cron = require("node-cron");

module.exports.getAllAnnouncements = async (req, res) => {
  const announcements = await announcementCollection.find().toArray();
  res.json(announcements);
};

module.exports.addAnnouncement = async (req, res) => {
  const announcement = req.body;

  const result = await announcementCollection.insertOne(announcement);

  // Send the new announcement to all connected clients
  getIo().emit("announcement", announcement);

  res.json(result);
};

module.exports.getAnnouncementsByOrganization = async (req, res) => {
  try {
    // Extract organizationId from request parameters
    const { organizationId } = req.params;

    // Validate organizationId
    if (!ObjectId.isValid(organizationId)) {
      return res.status(400).json({ message: "Invalid organizationId" });
    }

    // Query announcements for the given organizationId
    const announcements = await announcementCollection
      .find({ organizationId: organizationId })
      .toArray();

    // Return the retrieved announcements
    res.status(200).json({ announcements });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.markAnnouncementAsRead = async (req, res) => {
  try {
    // Extract announcement ID from request parameters
    const { announcementId } = req.params;

    // Validate announcementId
    if (!ObjectId.isValid(announcementId)) {
      return res.status(400).json({ message: "Invalid announcementId" });
    }

    // Extract user's email from request body
    const { userEmail } = req.body;

    // Update the announcement document to add user's email to readBy array
    const updatedAnnouncement = await announcementCollection.findOneAndUpdate(
      { _id: ObjectId(announcementId) },
      { $addToSet: { readBy: userEmail } }, // Use $addToSet to avoid duplicate emails
      { returnOriginal: false } // Return the updated document
    );

    // Check if the announcement exists and is updated
    if (!updatedAnnouncement.value) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Return the updated announcement
    res.status(200).json({ announcement: updatedAnnouncement.value });
  } catch (error) {
    console.error("Error marking announcement as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.markAnnouncementAsRemoved = async (req, res) => {
  try {
    // Extract announcement ID from request parameters
    const { announcementId } = req.params;

    // Validate announcementId
    if (!ObjectId.isValid(announcementId)) {
      return res.status(400).json({ message: "Invalid announcementId" });
    }

    // Extract user's email from request body
    const { userEmail } = req.body;

    // Update the announcement document to add user's email to removeBy array
    const updatedAnnouncement = await announcementCollection.findOneAndUpdate(
      { _id: ObjectId(announcementId) },
      { $addToSet: { removeBy: userEmail } }, // Use $addToSet to avoid duplicate emails
      { returnOriginal: false } // Return the updated document
    );

    // Check if the announcement exists and is updated
    if (!updatedAnnouncement.value) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Return the updated announcement
    res.status(200).json({ announcement: updatedAnnouncement.value });
  } catch (error) {
    console.error("Error marking announcement as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Schedule a cron job to delete old announcements every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Starting cron job to delete old announcements...");

    // Calculate the date one month ago
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Delete announcements published more than a month ago
    const deleteResult = await announcementCollection.deleteMany({
      $expr: {
        $lt: [{ $toDate: "$dateTime" }, oneMonthAgo],
      },
    });

    console.log(`${deleteResult.deletedCount} old announcements deleted.`);
  } catch (error) {
    console.error("Error deleting old announcements:", error);
  }
});
