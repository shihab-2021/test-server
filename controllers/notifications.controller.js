const { ObjectId } = require("mongodb");
const client = require("../utils/dbConnect");
const notificationCollection = client
  .db("experiment-labs")
  .collection("notifications");
const userCollection = client.db("experiment-labs").collection("users");
const { getIo } = require("../socketSetup");
const cron = require("node-cron");

module.exports.getAllNotifications = async (req, res) => {
  const notifications = await notificationCollection.find().toArray();
  res.json(notifications);
};

module.exports.addNotification = async (req, res) => {
  const notification = req.body;

  const result = await notificationCollection.insertOne(notification);

  // Send the new notification to all connected clients
  getIo().emit("notification", notification);

  res.json(result);
};

module.exports.getUserNotifications = async (req, res) => {
  try {
    const { userEmail } = req.params; // Extract the userEmail from the request parameters

    // Find the user with the specified userEmail
    const user = await userCollection.findOne({ email: userEmail });

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let notifications = [];

    // Fetch notifications based on recipient type
    if (user.role === "user") {
      notifications = await getStudentNotifications(user);
    } else if (user.role === "admin") {
      notifications = await getAdminNotifications(user);
    }
    // Add more conditions for other recipient types as needed

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getStudentNotifications = async (user) => {
  return notificationCollection
    .find({
      "recipient.organizationId": user.organizationId,
      $or: [
        {
          "recipient.type": "Students",
          "recipient.courseId": {
            $in: user.courses.map((course) => course.courseId),
          },
          "recipient.batches": {
            $elemMatch: {
              batchId: { $in: user.courses.map((course) => course.batchId) },
            },
          },
        },
        {
          "recipient.type": "Specific Student",
          "recipient.recipientEmail": user.email,
        },
      ],
    })
    .toArray();
};

// Helper function to get notifications for 'Admin' type
const getAdminNotifications = async (user) => {
  return notificationCollection
    .find({
      "recipient.organizationId": user.organizationId,
      $or: [
        {
          "recipient.type": "Admins",
        },
        {
          "recipient.type": "Specific Admin",
          "recipient.recipientEmail": user.email,
        },
      ],
    })
    .toArray();
};

module.exports.markNotificationAsRead = async (req, res) => {
  try {
    // Extract notification ID from request parameters
    const { notificationId } = req.params;

    // Validate notificationId
    if (!ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Invalid notificationId" });
    }

    // Extract user's email from request body
    const { userEmail } = req.body;

    // Update the notification document to add user's email to readBy array
    const updatedNotification = await notificationCollection.findOneAndUpdate(
      { _id: ObjectId(notificationId) },
      { $addToSet: { readBy: userEmail } }, // Use $addToSet to avoid duplicate emails
      { returnOriginal: false } // Return the updated document
    );

    // Check if the notification exists and is updated
    if (!updatedNotification.value) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Return the updated notification
    res.status(200).json({ notification: updatedNotification.value });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Schedule a cron job to delete old notifications every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Starting cron job to delete old notifications...");

    // Calculate the date one month ago
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Delete notifications published more than a month ago
    const deleteResult = await notificationCollection.deleteMany({
      $expr: {
        $lt: [{ $toDate: "$dateTime" }, oneMonthAgo],
      },
    });

    console.log(`${deleteResult.deletedCount} old notifications deleted.`);
  } catch (error) {
    console.error("Error deleting old notifications:", error);
  }
});
