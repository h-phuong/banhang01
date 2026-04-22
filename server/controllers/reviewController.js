const mongoose = require("mongoose");
const Review = require("../models/Review");
const Order = require("../models/Order");
const Notification = require("../models/Notification");

function extractObjectId(value) {
  if (!value) return "";

  if (
    typeof value === "string" &&
    mongoose.Types.ObjectId.isValid(value.trim())
  ) {
    return value.trim();
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return String(value);
  }

  if (typeof value === "object") {
    if (value._id) {
      const nestedId = extractObjectId(value._id);
      if (nestedId) return nestedId;
    }

    if (value.id) {
      const nestedId = extractObjectId(value.id);
      if (nestedId) return nestedId;
    }

    const asString = String(value);
    if (mongoose.Types.ObjectId.isValid(asString)) {
      return asString;
    }
  }

  return "";
}

function orderContainsProduct(order, productId) {
  const target = extractObjectId(productId);
  const details = Array.isArray(order?.details) ? order.details : [];

  return details.some((item) => {
    const candidates = [
      item?.productId,
      item?.productId?._id,
      item?.productId?.id,
      item?.product,
      item?.product?._id,
      item?.product?.id,
      item?.raw?.productId,
      item?.raw?.product,
    ];

    return candidates.some((value) => extractObjectId(value) === target);
  });
}

// =============================
// Lấy tất cả review (admin)
// =============================
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate("product", "name thumbnail images")
      .populate("user", "name fullName")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error("getAllReviews error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =============================
// Lấy review theo product (client chỉ lấy approved)
// =============================
exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "productId không hợp lệ" });
    }

    const reviews = await Review.find({
      product: productId,
      status: "approved",
    })
      .populate("product", "name thumbnail images")
      .populate("user", "name fullName")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error("getReviewsByProduct error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =============================
// Kiểm tra quyền đánh giá
// Chỉ cần: productId + orderCode
// =============================
exports.checkReviewPermission = async (req, res) => {
  try {
    const { productId } = req.params;
    const { orderCode } = req.query;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Thiếu hoặc sai productId" });
    }

    if (!orderCode || !orderCode.trim()) {
      return res.status(400).json({ message: "Thiếu mã đơn hàng" });
    }

    const cleanOrderCode = orderCode.trim();

    const order = await Order.findOne({
      orderCode: cleanOrderCode,
      status: "Delivered",
    });

    if (!order) {
      return res.json({
        canReview: false,
        reviewed: false,
        reason: "order_not_found",
      });
    }

    if (!orderContainsProduct(order, productId)) {
      return res.json({
        canReview: false,
        reviewed: false,
        reason: "product_not_in_order",
      });
    }

    const existed = await Review.findOne({
      product: productId,
      orderCode: cleanOrderCode,
    });

    return res.json({
      canReview: !existed,
      reviewed: !!existed,
      reason: existed ? "already_reviewed" : "ok",
      review: existed || null,
    });
  } catch (err) {
    console.error("checkReviewPermission error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =============================
// Tạo review
// Chỉ xác thực bằng: product + orderCode
// phone chỉ để lưu thông tin hiển thị
// =============================
exports.createReview = async (req, res) => {
  try {
    const { product, rating, comment, orderCode, guestName } = req.body;

    console.log("=== CREATE REVIEW START ===");
    console.log("REQ BODY:", req.body);

    if (!product || !mongoose.Types.ObjectId.isValid(product)) {
      return res.status(400).json({ message: "Thiếu sản phẩm" });
    }

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: "Số sao không hợp lệ" });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        message: "Vui lòng nhập nội dung đánh giá",
      });
    }

    if (!orderCode || !orderCode.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập mã đơn hàng" });
    }

    const cleanOrderCode = orderCode.trim();
    console.log("cleanOrderCode:", cleanOrderCode);

    const order = await Order.findOne({
      orderCode: cleanOrderCode,
      status: "Delivered",
    });

    console.log("FOUND ORDER:", order ? order._id : null);

    if (!order) {
      return res.status(400).json({
        message: "Đơn hàng không tồn tại hoặc chưa giao thành công",
      });
    }

    const hasProduct = orderContainsProduct(order, product);
    console.log("HAS PRODUCT IN ORDER:", hasProduct);

    if (!hasProduct) {
      return res.status(400).json({
        message: "Đơn hàng này không chứa sản phẩm bạn đang đánh giá",
      });
    }

    const existed = await Review.findOne({
      product,
      orderCode: cleanOrderCode,
    });

    console.log("EXISTED REVIEW:", existed ? existed._id : null);

    if (existed) {
      return res.status(400).json({
        message: "Sản phẩm trong đơn hàng này đã được đánh giá rồi",
      });
    }

    const reviewPayload = {
      product,
      rating: Number(rating),
      comment: comment.trim(),
      guestName:
        guestName?.trim() || order?.shippingAddress?.fullName || "Khách hàng",
      orderCode: cleanOrderCode,
      status: "pending",
    };

    console.log("REVIEW PAYLOAD:", reviewPayload);

    const review = await Review.create(reviewPayload);

    console.log("CREATED REVIEW:", review?._id);

    res.status(201).json({
      message: "Đã gửi đánh giá, vui lòng chờ duyệt",
      review,
    });
  } catch (err) {
    console.error("createReview error FULL:", err);
    res.status(500).json({
      message: "Lỗi tạo đánh giá",
      error: err.message,
      stack: err.stack,
    });
  }
};

// =============================
// Admin reply review
// =============================
exports.replyReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { adminReply: req.body.reply },
      { new: true },
    )
      .populate("user", "name fullName")
      .populate("product", "name");

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    if (review.user) {
      await Notification.create({
        userId: review.user._id,
        title: `Shop đã phản hồi đánh giá sản phẩm ${review.product?.name || ""}`,
        timeText: "Vừa xong",
        link: `/product/${review.product?._id}`,
      });
    }

    res.json(review);
  } catch (err) {
    console.error("replyReview error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =============================
// Duyệt review
// =============================
exports.approveReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true },
    );

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    res.json(review);
  } catch (err) {
    console.error("approveReview error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =============================
// Từ chối review
// =============================
exports.rejectReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true },
    );

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    res.json(review);
  } catch (err) {
    console.error("rejectReview error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =============================
// Xóa review
// =============================
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    res.json({
      message: "Đã xóa đánh giá",
    });
  } catch (err) {
    console.error("deleteReview error:", err);
    res.status(500).json({ error: err.message });
  }
};
