const mongoose = require("mongoose");

// ===============================
// CHI TIẾT SẢN PHẨM TRONG ĐƠN
// ===============================
const orderDetailSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    categoryName: {
      type: String,
      default: "",
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    thumbnail: {
      type: String,
      default: "",
      trim: true,
    },

    sku: {
      type: String,
      default: "",
      trim: true,
    },

    color: {
      type: String,
      required: true,
      trim: true,
      default: "-",
    },

    size: {
      type: String,
      required: true,
      trim: true,
      default: "-",
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

// ===============================
// LỊCH SỬ TRẠNG THÁI
// ===============================
const orderHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

// ===============================
// GHI CHÚ NỘI BỘ ADMIN
// ===============================
const adminNoteSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

// ===============================
// ĐƠN HÀNG CHÍNH
// ===============================
const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // =========================
    // SHIPPING
    // =========================
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },

      phoneNumber: {
        type: String,
        required: true,
        trim: true,
      },

      fullAddress: {
        type: String,
        required: true,
        trim: true,
      },

      city: {
        type: String,
        default: "",
        trim: true,
      },

      district: {
        type: String,
        default: "",
        trim: true,
      },

      ward: {
        type: String,
        default: "",
        trim: true,
      },
    },

    // =========================
    // PRICE
    // =========================
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    coupons: {
      type: [
        {
          couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Coupon",
            default: null,
          },
          code: {
            type: String,
            trim: true,
            default: "",
          },
          type: {
            type: String,
            trim: true,
            default: "",
          },
          discountAmount: {
            type: Number,
            default: 0,
            min: 0,
          },
        },
      ],
      default: [],
    },

    // =========================
    // PAYMENT
    // =========================
    paymentMethod: {
      type: String,
      enum: ["COD", "VNPAY", "MOMO", "BANKING"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Refunded"],
      default: "Unpaid",
    },

    // =========================
    // ORDER STATUS
    // =========================
    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Processing",
        "Shipping",
        "Delivered",
        "Cancelled",
        "Returned",
      ],
      default: "Pending",
    },

    // =========================
    // NOTE
    // =========================
    customerNote: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================
    // BỔ SUNG NHẸ - KHÔNG PHÁ LOGIC CŨ
    // =========================
    cancelReason: {
      type: String,
      default: "",
      trim: true,
    },

    returnReason: {
      type: String,
      default: "",
      trim: true,
    },

    adminNotes: {
      type: [adminNoteSchema],
      default: [],
    },

    // =========================
    // PRODUCT DETAILS
    // =========================
    details: {
      type: [orderDetailSchema],
      default: [],
      validate: {
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "Đơn hàng phải có ít nhất 1 sản phẩm",
      },
    },

    // =========================
    // HISTORY
    // =========================
    history: {
      type: [orderHistorySchema],
      default: [],
    },
  },
  { timestamps: true },
);

// ===============================
// AUTO CREATE ORDER CODE
// ===============================
orderSchema.pre("save", function () {
  if (!this.orderCode) {
    const random = Math.floor(100000 + Math.random() * 900000);
    this.orderCode = `ORD${Date.now()}${random}`;
  }
});

// ===============================
// INDEX
// ===============================
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderCode: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ "shippingAddress.fullName": 1 });
orderSchema.index({ "shippingAddress.phoneNumber": 1 });

// ===============================
// EXPORT
// ===============================
module.exports = mongoose.model("Order", orderSchema);
