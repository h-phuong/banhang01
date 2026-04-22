const express = require("express");
const router = express.Router();
const {
  createMoMoPayment,
  momoCallback,
  checkMoMoStatus,
} = require("../controllers/momoController");

// Tạo link thanh toán MoMo
router.post("/create", createMoMoPayment);

// MoMo callback (IPN) — MoMo tự gọi về sau khi khách trả tiền
router.post("/callback", momoCallback);

// Kiểm tra trạng thái đơn
router.get("/check-status/:orderId", checkMoMoStatus);

module.exports = router;
