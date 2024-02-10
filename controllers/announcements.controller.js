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
