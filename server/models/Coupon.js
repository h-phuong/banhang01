// models/Coupon.js
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },

    // Hình thức giảm: percent (%) hoặc fixed (tiền cố định)
    type: {
      type: String,
      enum: ["percent", "fixed"],
      default: "percent",
    },

    // Flash sale (Khung giờ sale)
    isFlashSale: { type: Boolean, default: false },

    // Giá trị giảm
    discountValue: { type: Number, required: true, default: 0 },

    minOrderValue: { type: Number, required: true, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    limit: { type: Number, default: 100 },
    usageCount: { type: Number, default: 0 },
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    banner: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Coupon", couponSchema);
