const express = require("express");
const router = express.Router();

const {
  getMyNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} = require("../controllers/notificationController");

router.get("/my/:userId", getMyNotifications);
router.post("/", createNotification);
router.patch("/:id/read", markNotificationAsRead);
router.patch("/my/:userId/read-all", markAllNotificationsAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
