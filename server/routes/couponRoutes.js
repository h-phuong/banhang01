// routes/couponRoutes.js
const express = require("express");
const Coupon = require("../models/Coupon");
const router = express.Router();

// 1. Lấy tất cả mã giảm giá
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId;
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });

    const result = coupons.map((coupon) => {
      const usageCount = Number(coupon.usageCount || 0);
      const usedCount = Array.isArray(coupon.usedBy) ? coupon.usedBy.length : 0;
      const remaining = Math.max(0, Number(coupon.limit || 0) - usageCount);
      const isUsedByUser =
        userId && Array.isArray(coupon.usedBy)
          ? coupon.usedBy.some((u) => String(u) === String(userId))
          : false;

      return {
        ...coupon.toObject(),
        usedCount,
        remaining,
        isUsedByUser,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// 1b. Kiểm tra mã cho user
router.get("/validate", async (req, res) => {
  try {
    const code = String(req.query.code || "")
      .trim()
      .toUpperCase();
    const userId = req.query.userId;

    if (!code) {
      return res.status(400).json({ message: "Thiếu mã voucher" });
    }

    const coupon = await Coupon.findOne({ code });
    if (!coupon) {
      return res.status(404).json({ message: "Mã voucher không tồn tại" });
    }

    const now = new Date();
    if (
      !coupon.isActive ||
      (coupon.startDate && coupon.startDate > now) ||
      (coupon.endDate && coupon.endDate < now)
    ) {
      return res.status(400).json({ message: "Mã voucher không khả dụng" });
    }

    const usageCount = Number(coupon.usageCount || 0);
    if (Number(coupon.limit || 0) - usageCount <= 0) {
      return res.status(400).json({ message: "Mã voucher đã hết số lượng" });
    }

    if (
      userId &&
      Array.isArray(coupon.usedBy) &&
      coupon.usedBy.some((id) => String(id) === String(userId))
    ) {
      return res.status(400).json({ message: "Bạn đã sử dụng mã này" });
    }

    res.json({ message: "Mã voucher hợp lệ", coupon: coupon.toObject() });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// 2. Tạo mã mới
router.post("/", async (req, res) => {
  try {
    const {
      name,
      code,
      type,
      isFlashSale,
      discountType,
      discountValue,
      maxDiscountValue,
      minOrderValue,
      startDate,
      endDate,
      limit,
      banner,
    } = req.body;

    const couponExists = await Coupon.findOne({ code });
    if (couponExists) {
      return res.status(400).json({ message: "Mã giảm giá này đã tồn tại!" });
    }

    const coupon = new Coupon({
      name,
      code,
      type,
      isFlashSale,
      discountType,
      discountValue,
      maxDiscountValue,
      minOrderValue,
      startDate,
      endDate,
      limit,
      banner,
    });

    const createdCoupon = await coupon.save();
    res.status(201).json(createdCoupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Xóa mã
router.delete("/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (coupon) {
      await coupon.deleteOne();
      res.json({ message: "Đã xóa mã" });
    } else {
      res.status(404).json({ message: "Không tìm thấy mã" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
