const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/payment.controller");
const { asyncHandler } = require("../helpers/asyncHandler");
const { authenticationV2 } = require("../auth/authUtils");

// Route tạo thanh toán (cần đăng nhập)
router.post(
  "/create",
  authenticationV2,
  asyncHandler(PaymentController.createPayment),
);

// Route MoMo callback — IPN (MoMo gọi tự động, KHÔNG cần auth)
router.post("/momo-callback", asyncHandler(PaymentController.momoCallback));

// Route redirect sau khi user thanh toán xong trên MoMo
router.get("/momo-return", asyncHandler(PaymentController.momoReturn));

module.exports = router;
