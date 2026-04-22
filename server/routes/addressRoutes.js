const express = require("express");
const router = express.Router();
const c = require("../controllers/addressController");

router.get("/my/:userId", c.getMyAddresses);
router.post("/", c.createAddress);
router.put("/:id", c.updateAddress);
router.patch("/:id/default", c.setDefault);
router.delete("/:id", c.deleteAddress);

module.exports = router;
