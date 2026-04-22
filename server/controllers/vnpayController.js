const {
  VNPay,
  ignoreLogger,
  ProductCode,
  VnpLocale,
  dateFormat,
  IpnFailChecksum,
  IpnOrderNotFound,
  IpnInvalidAmount,
  IpnSuccess,
  IpnUnknownError,
} = require("vnpay");

const Order = require("../models/Order");

const vnpay = new VNPay({
  tmnCode: process.env.VNP_TMN_CODE,
  secureSecret: process.env.VNP_HASH_SECRET,
  vnpayHost: "https://sandbox.vnpayment.vn",
  testMode: true,
  hashAlgorithm: "SHA512",
  loggerFn: ignoreLogger,
});

// ── POST /api/payment/vnpay ───────────────────────────────────────────────────
const createVnpayPayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ message: "Thiếu orderId hoặc amount" });
    }

    const ipAddr =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "127.0.0.1";

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount:     Number(amount),
      vnp_IpAddr:     ipAddr,
      vnp_TxnRef:     String(orderId),
      vnp_OrderInfo:  `Thanh toan don hang ${orderId}`,
      vnp_OrderType:  ProductCode.Other,
      vnp_ReturnUrl:  `${process.env.APP_URL}/api/payment/vnpay-return`,
      vnp_Locale:     VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(new Date(Date.now() + 15 * 60 * 1000)),
    });

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: "pending",
      paymentMethod: "VNPAY",
    });

    return res.status(200).json({ paymentUrl });
  } catch (err) {
    console.error("createVnpayPayment error:", err);
    return res.status(500).json({
      message: "Lỗi tạo thanh toán VNPay",
      error: err.message,
    });
  }
};

// ── GET /api/payment/vnpay-ipn ────────────────────────────────────────────────
// VNPay server tự gọi để xác nhận giao dịch
const vnpayIpn = async (req, res) => {
  try {
    const verify = vnpay.verifyIpnCall(req.query);

    if (!verify.isVerified) return res.json(IpnFailChecksum);

    const order = await Order.findById(verify.vnp_TxnRef);
    if (!order) return res.json(IpnOrderNotFound);

    if (Number(order.finalAmount || order.totalPrice) !== verify.vnp_Amount)
      return res.json(IpnInvalidAmount);

    if (order.paymentStatus === "paid") return res.json(IpnSuccess);

    await Order.findByIdAndUpdate(verify.vnp_TxnRef, {
      paymentStatus:      verify.isSuccess ? "paid" : "failed",
      status:             verify.isSuccess ? "Confirmed" : order.status,
      vnp_TransactionNo:  req.query.vnp_TransactionNo || null,
      vnp_BankCode:       req.query.vnp_BankCode      || null,
      vnp_PayDate:        req.query.vnp_PayDate        || null,
      vnp_ResponseCode:   req.query.vnp_ResponseCode   || null,
    });

    return res.json(IpnSuccess);
  } catch (err) {
    console.error("vnpayIpn error:", err);
    return res.json(IpnUnknownError);
  }
};

// ── GET /api/payment/vnpay-return ─────────────────────────────────────────────
// VNPay redirect khách hàng về đây sau khi thanh toán
// → Backend verify rồi redirect tiếp về Frontend /payment/vnpay-result
const vnpayReturn = async (req, res) => {
  try {
    const verify  = vnpay.verifyReturnUrl(req.query);
    const orderId = verify.vnp_TxnRef || req.query.vnp_TxnRef;

    if (orderId) {
      const order = await Order.findById(orderId);
      if (order && order.paymentStatus === "pending") {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus:      verify.isSuccess ? "paid"      : "failed",
          status:             verify.isSuccess ? "Confirmed" : order.status,
          vnp_TransactionNo:  req.query.vnp_TransactionNo || null,
          vnp_BankCode:       req.query.vnp_BankCode      || null,
          vnp_PayDate:        req.query.vnp_PayDate        || null,
          vnp_ResponseCode:   req.query.vnp_ResponseCode   || null,
        });
      }
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const params = new URLSearchParams({
      success:       verify.isSuccess ? "1" : "0",
      orderId:       orderId                        || "",
      amount:        verify.vnp_Amount              || req.query.vnp_Amount || "",
      bankCode:      req.query.vnp_BankCode         || "",
      transactionNo: req.query.vnp_TransactionNo    || "",
      responseCode:  req.query.vnp_ResponseCode     || "",
    });

    return res.redirect(`${clientUrl}/payment/vnpay-result?${params}`);
  } catch (err) {
    console.error("vnpayReturn error:", err);
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    return res.redirect(`${clientUrl}/payment/vnpay-result?success=0`);
  }
};

module.exports = { createVnpayPayment, vnpayIpn, vnpayReturn };
