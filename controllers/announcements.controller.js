const { ObjectId } = require("mongodb");
const client = require("../utils/dbConnect");
const announcementCollection = client
  .db("experiment-labs")
  .collection("announcements");
const { getIo } = require("../socketSetup");

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
