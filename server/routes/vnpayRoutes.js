const express = require("express");
const router = express.Router();

const {
  createVnpayPayment,
  vnpayIpn,
  vnpayReturn,
} = require("../controllers/vnpayController");

router.post("/vnpay", createVnpayPayment);
router.get("/vnpay-ipn", vnpayIpn);
router.get("/vnpay-return", vnpayReturn);

module.exports = router;
