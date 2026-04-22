const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Order = require("../models/Order");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Notification = require("../models/Notification");
const orderController = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// ==============================
// HELPERS
// ==============================
function normalizePaymentMethod(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "cod") return "COD";
  if (raw === "momo") return "MOMO";
  if (raw === "vnpay") return "VNPAY";
  if (raw === "banking" || raw === "bank") return "BANKING";
  return "COD";
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || "").trim());
}

function extractObjectId(...values) {
  for (const value of values) {
    if (!value) continue;

    if (typeof value === "string" && isValidObjectId(value)) {
      return String(value).trim();
    }

    if (typeof value === "object") {
      if (typeof value._id === "string" && isValidObjectId(value._id)) {
        return String(value._id).trim();
      }
      if (typeof value.id === "string" && isValidObjectId(value.id)) {
        return String(value.id).trim();
      }
    }
  }
  return null;
}

function generateOrderCode() {
  return `DH${Date.now()}`;
}

// ==============================
// TEST API
// ==============================
router.get("/test", (req, res) => {
  res.send("Order API working");
});

// ==============================
// TẠO ĐƠN HÀNG
// customer/admin/manager/staff đều phải đăng nhập mới tạo đơn
// ==============================
router.post("/", protect, async (req, res) => {
  try {
    const {
      userId,
      items,
      totalPrice,
      subtotal,
      shippingFee,
      productDiscount,
      shippingDiscount,
      vouchers,
      name,
      phone,
      address,
      city,
      district,
      ward,
      note,
      paymentMethod,
    } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({ message: "Thiếu thông tin người nhận" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Không có sản phẩm" });
    }

    if (
      req.user.role === "customer" &&
      userId &&
      String(userId) !== String(req.user._id)
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không thể tạo đơn cho người dùng khác" });
    }

    const finalUserId = userId || req.user._id;

    const details = [];

    for (const item of items) {
      const productId = extractObjectId(item?.productId);
      const quantity = toNumber(item?.quantity, 1);
      const unitPrice = toNumber(item?.price, 0);

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(400).json({ message: "Sản phẩm không tồn tại" });
      }

      details.push({
        productId,
        productName: product.name,
        thumbnail: product.thumbnail || "",
        categoryId: product.categoryId,
        categoryName: product.categoryName || "",
        quantity,
        unitPrice,
      });
    }

    const finalAmount = toNumber(totalPrice, 0);

    const newOrder = new Order({
      orderCode: generateOrderCode(),
      userId: finalUserId,
      shippingAddress: {
        fullName: name,
        phoneNumber: phone,
        fullAddress: address,
        city,
        district,
        ward,
      },
      totalPrice: subtotal,
      shippingFee,
      discountAmount:
        toNumber(productDiscount, 0) + toNumber(shippingDiscount, 0),
      finalAmount,
      paymentMethod: normalizePaymentMethod(paymentMethod),
      paymentStatus: "Unpaid",
      customerNote: note,
      details,
      history: [
        {
          status: "Pending",
          note: "Đơn hàng được tạo",
          timestamp: new Date(),
        },
      ],
    });

    await newOrder.save();

    return res.status(201).json({
      message: "Đặt hàng thành công",
      order: newOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// ==============================
// LẤY ĐƠN USER
// customer chỉ xem đơn của chính mình
// admin/manager/staff có thể xem theo userId
// ==============================
router.get("/my-orders/:userId", protect, async (req, res) => {
  try {
    if (
      req.user.role === "customer" &&
      String(req.user._id) !== String(req.params.userId)
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xem đơn của người khác" });
    }

    const orders = await Order.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// ==============================
// ADMIN / MANAGER / STAFF - LẤY TẤT CẢ ĐƠN
// ==============================
router.get(
  "/",
  protect,
  authorizeRoles("admin", "manager", "staff"),
  async (req, res) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server" });
    }
  },
);

// ==============================
// UPDATE STATUS
// admin / manager / staff
// ==============================
router.patch(
  "/:orderId/status",
  protect,
  authorizeRoles("admin", "manager", "staff"),
  async (req, res) => {
    try {
      const { status } = req.body;

      const order = await Order.findById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      order.status = status;
      await order.save();

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server" });
    }
  },
);

// ==============================
// DELIVERED
// admin / manager / staff
// ==============================
router.patch(
  "/:orderId/delivered",
  protect,
  authorizeRoles("admin", "manager", "staff"),
  orderController.markDelivered,
);

// ==============================
// ADMIN NOTE
// admin / manager / staff
// ==============================
router.post(
  "/:orderId/admin-note",
  protect,
  authorizeRoles("admin", "manager", "staff"),
  orderController.addAdminNote,
);

// ==============================
// PAYMENT STATUS
// admin / manager
// ==============================
router.patch(
  "/:orderId/payment",
  protect,
  authorizeRoles("admin", "manager"),
  orderController.updatePaymentStatus,
);

// ==============================
// DELETE
// admin / manager
// ==============================
router.delete(
  "/:orderId",
  protect,
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      await Order.findByIdAndDelete(req.params.orderId);
      res.json({ message: "Deleted" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server" });
    }
  },
);

module.exports = router;
