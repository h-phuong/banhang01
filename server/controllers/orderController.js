const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

// ==============================
// HELPERS
// ==============================
function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || "").trim());
}

// ==============================
// MARK ORDER DELIVERED
// ==============================
exports.markDelivered = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (order.status === "Delivered") {
      return res.json({
        message: "Đơn đã được giao trước đó",
        order,
      });
    }

    const paymentMethod = String(order.paymentMethod || "").toUpperCase();
    const paymentStatus = String(order.paymentStatus || "");
    const isCOD = paymentMethod === "COD";

    if (!isCOD && paymentStatus !== "Paid") {
      return res.status(400).json({
        message: "Đơn chưa thanh toán nên chưa thể hoàn tất.",
      });
    }

    if (!Array.isArray(order.details) || order.details.length === 0) {
      return res.status(400).json({
        message: "Đơn hàng không có sản phẩm để xử lý.",
      });
    }

    for (const item of order.details) {
      if (!item.productId) {
        return res.status(400).json({
          message: "Đơn hàng có sản phẩm không hợp lệ.",
        });
      }

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          message: "Không tìm thấy sản phẩm trong đơn",
        });
      }

      const itemQty = Number(item.quantity || 0);

      if (itemQty <= 0) {
        return res.status(400).json({
          message: `Số lượng sản phẩm không hợp lệ: ${
            item.productName || "Sản phẩm"
          }`,
        });
      }

      // =========================
      // 🔥 FIX: LƯU CATEGORY VÀO ORDER (nếu chưa có)
      // =========================
      if (!item.categoryName) {
        item.categoryId = product.categoryId;
        item.categoryName = product.categoryName || "";
      }

      // =========================
      // STOCK LOGIC (GIỮ NGUYÊN)
      // =========================
      if (item.variantId) {
        const variant = product.variants.id(item.variantId);

        if (!variant) {
          return res.status(404).json({
            message: `Không tìm thấy biến thể của sản phẩm ${
              item.productName || product.name || ""
            }`,
          });
        }

        const currentQty = Number(variant.quantity || 0);

        if (currentQty < itemQty) {
          return res.status(400).json({
            message: `Sản phẩm ${
              item.productName || product.name || ""
            } không đủ tồn kho`,
          });
        }

        variant.quantity = currentQty - itemQty;
      } else {
        const totalVariantQty = Array.isArray(product.variants)
          ? product.variants.reduce(
              (sum, v) => sum + Number(v.quantity || 0),
              0,
            )
          : 0;

        if (totalVariantQty < itemQty) {
          return res.status(400).json({
            message: `Sản phẩm ${
              item.productName || product.name || ""
            } không đủ tồn kho`,
          });
        }

        let remaining = itemQty;

        for (const variant of product.variants) {
          const currentQty = Number(variant.quantity || 0);
          if (currentQty <= 0) continue;

          const deduct = Math.min(currentQty, remaining);
          variant.quantity = currentQty - deduct;
          remaining -= deduct;

          if (remaining <= 0) break;
        }
      }

      product.soldCount = Number(product.soldCount || 0) + itemQty;
      product.orderCount = Number(product.orderCount || 0) + 1;

      await product.save();
    }

    order.status = "Delivered";

    if (isCOD && paymentStatus !== "Paid") {
      order.paymentStatus = "Paid";
    }

    order.history.push({
      status: "Delivered",
      note: "Admin xác nhận giao hàng thành công",
      timestamp: new Date(),
    });

    await order.save();

    return res.json({
      message: "Đã giao hàng thành công 🎉",
      order,
    });
  } catch (error) {
    console.error("markDelivered error:", error);

    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// ==============================
// THÊM GHI CHÚ NỘI BỘ
// ==============================
exports.addAdminNote = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { content, createdBy } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    if (!String(content || "").trim()) {
      return res.status(400).json({
        message: "Nội dung ghi chú không được để trống",
      });
    }

    order.adminNotes.push({
      content: String(content).trim(),
      createdBy: isValidObjectId(createdBy) ? createdBy : null,
      createdAt: new Date(),
    });

    await order.save();

    return res.json({
      message: "Đã thêm ghi chú nội bộ",
      order,
    });
  } catch (error) {
    console.error("addAdminNote error:", error);

    return res.status(500).json({
      message: "Không thêm được ghi chú nội bộ",
      error: error.message,
    });
  }
};

// ==============================
// CẬP NHẬT TRẠNG THÁI THANH TOÁN
// ==============================
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, note } = req.body;

    const allowedPaymentStatuses = ["Unpaid", "Paid", "Refunded"];

    if (!allowedPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        message: "Trạng thái thanh toán không hợp lệ",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng",
      });
    }

    order.paymentStatus = paymentStatus;

    order.history.push({
      status: order.status,
      note: String(
        note || `Admin cập nhật thanh toán: ${paymentStatus}`,
      ).trim(),
      timestamp: new Date(),
    });

    await order.save();

    return res.json({
      message: "Cập nhật trạng thái thanh toán thành công",
      order,
    });
  } catch (error) {
    console.error("updatePaymentStatus error:", error);

    return res.status(500).json({
      message: "Không cập nhật được trạng thái thanh toán",
      error: error.message,
    });
  }
};

// ==============================
// 🔥 MIGRATE CATEGORY CHO ORDER CŨ
// ==============================
exports.migrateCategoryToOrders = async (req, res) => {
  try {
    const orders = await Order.find({});

    for (const order of orders) {
      let changed = false;

      for (const item of order.details || []) {
        if (!item.categoryName && item.productId) {
          const product = await Product.findById(item.productId);

          if (product) {
            item.categoryId = product.categoryId;
            item.categoryName = product.categoryName || "";
            changed = true;
          }
        }
      }

      if (changed) {
        await order.save();
      }
    }

    return res.json({
      message: "Đã migrate category vào order thành công",
    });
  } catch (error) {
    console.error("migrateCategory error:", error);

    return res.status(500).json({
      message: "Lỗi migrate category",
      error: error.message,
    });
  }
};
