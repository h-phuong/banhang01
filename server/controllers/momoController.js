const crypto = require("crypto");
const axios  = require("axios");
const Order  = require("../models/Order");

// ── Cấu hình MoMo Sandbox ────────────────────────────────────────────────────
const PARTNER_CODE  = process.env.MOMO_PARTNER_CODE || "MOMOBKUN20180529";
const ACCESS_KEY    = process.env.MOMO_ACCESS_KEY   || "klm05TvNBzhg7h7j";
const SECRET_KEY    = process.env.MOMO_SECRET_KEY   || "at67qH6mk8w5Y1nAyMoTKhpBoMmvswru";
const ENDPOINT      = "https://test-payment.momo.vn/v2/gateway/api/create";
const BACKEND_URL   = process.env.BACKEND_URL  || "http://localhost:5000";
const FRONTEND_URL  = process.env.FRONTEND_URL || "http://localhost:5173";

// ── POST /api/momo/create ─────────────────────────────────────────────────────
const createMoMoPayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ message: "Thiếu orderId hoặc amount" });
    }

    const requestId  = `${PARTNER_CODE}${Date.now()}`;
    const orderInfo  = `Thanh toan don hang ${orderId}`;
    const requestType = "payWithMethod";

    // redirectUrl: MoMo redirect khách về đây sau khi thanh toán
    // MoMo sẽ tự append ?partnerCode=...&orderId=...&resultCode=0&... vào redirectUrl
    const redirectUrl = `${FRONTEND_URL}/payment/momo-result`;
    // extraData PHẢI là chuỗi rỗng khi ký — không dùng base64
    const extraData = "";

    // ipnUrl: MoMo server gọi về để xác nhận
    // Khi test local, MoMo không thể gọi về localhost
    // → Dùng BACKEND_URL từ .env (nếu có ngrok thì điền ngrok URL vào đó)
    // → Nếu không có, dùng một URL tạm — IPN sẽ fail nhưng redirectUrl vẫn hoạt động
    const ipnUrl = `${BACKEND_URL}/api/momo/callback`;

    // Tạo chữ ký HMAC-SHA256
    const rawSignature =
      `accessKey=${ACCESS_KEY}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${PARTNER_CODE}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    const body = {
      partnerCode: PARTNER_CODE,
      accessKey:   ACCESS_KEY,
      requestId,
      amount:      String(amount),
      orderId:     String(orderId),
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData,
      signature,
      lang: "vi",
    };

    console.log("📤 MoMo request body:", JSON.stringify(body, null, 2));

    const momoRes = await axios.post(ENDPOINT, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    console.log("📥 MoMo response:", JSON.stringify(momoRes.data, null, 2));

    // MoMo trả về { resultCode, payUrl, ... }
    // resultCode = 0 là thành công
    if (momoRes.data.resultCode !== 0) {
      return res.status(400).json({
        message: momoRes.data.localMessage || momoRes.data.message || "MoMo từ chối yêu cầu",
        resultCode: momoRes.data.resultCode,
      });
    }

    return res.json(momoRes.data); // { payUrl, deeplink, qrCodeUrl, ... }

  } catch (err) {
    console.error("❌ MoMo create error:", err?.response?.data || err.message);
    return res.status(500).json({
      message: err?.response?.data?.localMessage || "Lỗi tạo thanh toán MoMo",
      detail:  err?.response?.data || err.message,
    });
  }
};

// ── POST /api/momo/callback ───────────────────────────────────────────────────
// MoMo IPN — gọi từ MoMo server về backend sau khi thanh toán
const momoCallback = async (req, res) => {
  try {
    const {
      partnerCode, orderId, requestId, amount,
      orderInfo, orderType, transId, resultCode,
      message, payType, responseTime, extraData, signature,
    } = req.body;

    // Xác minh chữ ký
    const rawSignature =
      `accessKey=${ACCESS_KEY}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expectedSig = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    if (signature !== expectedSig) {
      console.warn("⚠️ MoMo callback: chữ ký không hợp lệ");
      return res.status(400).json({ message: "Chữ ký không hợp lệ" });
    }

    if (Number(resultCode) === 0) {
      await Order.findByIdAndUpdate(orderId, {
        status:        "Confirmed",
        paymentStatus: "paid",
        momoTransId:   transId,
        paidAt:        new Date(),
      });
      console.log(`✅ MoMo IPN OK: orderId=${orderId}, transId=${transId}`);
    } else {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "failed",
      });
      console.warn(`❌ MoMo IPN thất bại: orderId=${orderId}, resultCode=${resultCode}`);
    }

    return res.status(200).json({ message: "ok" });
  } catch (err) {
    console.error("MoMo callback error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/momo/check-status/:orderId ──────────────────────────────────────
const checkMoMoStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const isPaid = order.paymentStatus === "paid" || order.status === "Confirmed";

    return res.json({
      resultCode:    isPaid ? 0 : 1,
      status:        order.status,
      paymentStatus: order.paymentStatus,
      order,
    });
  } catch (err) {
    console.error("Check MoMo status error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createMoMoPayment, momoCallback, checkMoMoStatus };
