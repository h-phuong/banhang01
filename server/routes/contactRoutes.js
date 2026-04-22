const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");

router.post("/", contactController.createContact);
router.get("/", contactController.getContacts);
router.put("/:id/reply", contactController.replyContact);
router.get("/unread", contactController.getUnreadContacts);

module.exports = router;