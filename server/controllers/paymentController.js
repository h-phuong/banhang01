const crypto = require("crypto");
const https = require("https");
const paymentModel = require("../models/payment.model");
const cartModel = require("../models/cart.model");
const couponModel = require("../models/coupon.model");
const { NotFoundError, BadRequestError } = require("../core/error.response");
const { Created, OK } = require("../core/success.response");

const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || "MOMO",
  accessKey: process.env.MOMO_ACCESS_KEY || "F8BBA842ECF85",
  secretKey: process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz",
  ipnUrl:
    process.env.MOMO_IPN_URL ||
    "https://shadeful-darcy-crossed.ngrok-free.dev/api/payment/momo-callback",
  redirectUrl:
    process.env.MOMO_REDIRECT_URL ||
    "http://localhost:5173/payment/momo-return",
  requestType: "payWithATM",
  lang: "vi",
};

function generateOrderId() {
  const now = new Date();
  const timestamp = now.getTime();
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const milliseconds = now.getMilliseconds().toString().padStart(3, "0");
  return `MOMO${timestamp}${seconds}${milliseconds}`;
}

function callMoMoAPI(body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: "test-payment.momo.vn",
      port: 443,
      path: "/v2/gateway/api/create",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("MoMo response parse error"));
        }
      });
    });

    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

class PaymentController {
  async createPayment(req, res) {
    const { typePayment } = req.body;
    const id = req.user;

    const findCartUser = await cartModel.findOne({ userId: id });
    if (!findCartUser) throw new NotFoundError("Giỏ hàng không tồn tại");
    if (findCartUser.products.length === 0) {
      throw new BadRequestError("Giỏ hàng không có sản phẩm");
    }

    if (typePayment === "cod") {
      const newPayment = await paymentModel.create({
        userId: id,
        products: findCartUser.products,
        totalPrice: findCartUser.totalPrice,
        fullName: findCartUser.fullName,
        phoneNumber: findCartUser.phoneNumber,
        address: findCartUser.address,
        email: findCartUser.email,
        finalPrice: findCartUser.finalPrice,
        couponId: findCartUser.couponId,
        paymentMethod: "cod",
        status: "pending",
      });

      await findCartUser.deleteOne();
      await cartModel.create({ userId: id, products: [] });

      if (findCartUser.couponId) {
        await couponModel.findByIdAndUpdate(findCartUser.couponId, {
          $inc: { quantity: -1 },
        });
      }

      return new Created({
        message: "Tạo đơn hàng thành công",
        metadata: newPayment,
      }).send(res);
    }

    if (typePayment === "momo") {
      const orderId = generateOrderId();
      const orderInfo = `Thanh toan don hang ${orderId} userId ${id}`;
      const amount = String(findCartUser.finalPrice);
      const extraData = "";
      const requestId = `${MOMO_CONFIG.partnerCode}${Date.now()}`;

      const rawSignature =
        `accessKey=${MOMO_CONFIG.accessKey}` +
        `&amount=${amount}` +
        `&extraData=${extraData}` +
        `&ipnUrl=${MOMO_CONFIG.ipnUrl}` +
        `&orderId=${orderId}` +
        `&orderInfo=${orderInfo}` +
        `&partnerCode=${MOMO_CONFIG.partnerCode}` +
        `&redirectUrl=${MOMO_CONFIG.redirectUrl}` +
        `&requestId=${requestId}` +
        `&requestType=${MOMO_CONFIG.requestType}`;

      const signature = crypto
        .createHmac("sha256", MOMO_CONFIG.secretKey)
        .update(rawSignature)
        .digest("hex");

      const requestBody = {
        partnerCode: MOMO_CONFIG.partnerCode,
        accessKey: MOMO_CONFIG.accessKey,
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl: MOMO_CONFIG.redirectUrl,
        ipnUrl: MOMO_CONFIG.ipnUrl,
        extraData,
        requestType: MOMO_CONFIG.requestType,
        signature,
        lang: MOMO_CONFIG.lang,
      };

      const momoResponse = await callMoMoAPI(requestBody);

      if (momoResponse.resultCode !== 0) {
        throw new BadRequestError(`MoMo lỗi: ${momoResponse.message}`);
      }

      return new Created({
        message: "Tạo link thanh toán MoMo thành công",
        metadata: {
          payUrl: momoResponse.payUrl,
          qrCodeUrl: momoResponse.qrCodeUrl,
          deeplink: momoResponse.deeplink,
          orderId,
          amount,
        },
      }).send(res);
    }

    throw new BadRequestError("Phương thức thanh toán không hợp lệ");
  }

  async momoCallback(req, res) {
    const {
      resultCode,
      orderInfo,
      orderId,
      amount,
      signature: receivedSig,
      requestId,
      transId,
      message,
      responseTime,
      payType,
      orderType,
    } = req.body;

    const rawSignature =
      `accessKey=${MOMO_CONFIG.accessKey}` +
      `&amount=${amount}` +
      `&extraData=` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${MOMO_CONFIG.partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expectedSig = crypto
      .createHmac("sha256", MOMO_CONFIG.secretKey)
      .update(rawSignature)
      .digest("hex");

    if (expectedSig !== receivedSig) {
      return res.status(400).json({ message: "Chữ ký không hợp lệ" });
    }

    if (String(resultCode) !== "0") {
      return res.status(400).json({ message: "Thanh toán thất bại" });
    }

    const parts = orderInfo.split(" ");
    const userId = parts[parts.length - 1];

    const findCartUser = await cartModel.findOne({ userId });
    if (!findCartUser) {
      return res.status(404).json({ message: "Giỏ hàng không tồn tại" });
    }

    const newPayment = await paymentModel.create({
      userId,
      products: findCartUser.products,
      totalPrice: findCartUser.totalPrice,
      fullName: findCartUser.fullName,
      phoneNumber: findCartUser.phoneNumber,
      address: findCartUser.address,
      email: findCartUser.email,
      finalPrice: findCartUser.finalPrice,
      couponId: findCartUser.couponId,
      paymentMethod: "momo",
      status: "paid",
      transactionId: String(transId),
    });

    await findCartUser.deleteOne();
    await cartModel.create({ userId, products: [] });

    if (findCartUser.couponId) {
      await couponModel.findByIdAndUpdate(findCartUser.couponId, {
        $inc: { quantity: -1 },
      });
    }

    return res.status(200).json({
      message: "Tạo đơn hàng thành công",
      metadata: newPayment,
    });
  }

  async momoReturn(req, res) {
    const { resultCode, orderId, amount, message } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (String(resultCode) !== "0") {
      return res.redirect(
        `${frontendUrl}/payment/failed?orderId=${orderId}&message=${encodeURIComponent(message)}`,
      );
    }

    return res.redirect(
      `${frontendUrl}/payment/success?orderId=${orderId}&amount=${amount}`,
    );
  }
}

module.exports = new PaymentController();
