const mongoose = require("mongoose");

// --- Schema con: Biến thể (Màu/Size/Kho) ---
const productVariantSchema = new mongoose.Schema({
  color: { type: mongoose.Schema.Types.ObjectId, ref: "Color", required: true },
  size: { type: mongoose.Schema.Types.ObjectId, ref: "Size", required: true },
  quantity: { type: Number, required: true, min: 0 },
  priceModifier: { type: Number, default: 0 },
  sku: { type: String, trim: true, default: "" },
});

// --- Schema con: Hình ảnh ---
const productImageSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  sortOrder: { type: Number, default: 0 },
});

// --- Schema chính: Product ---
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, required: true, lowercase: true },
    description: { type: String, default: "" },
    usageGuide: { type: String, default: "" },
    highlights: { type: String, default: "" },

    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, default: 0, min: 0 },
    promotionalPrice: { type: Number, default: null, min: 0 },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    thumbnail: { type: String, default: "" },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    isNew: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },

    viewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    soldCount: { type: Number, default: 0, min: 0 },
    orderCount: { type: Number, default: 0, min: 0 },

    variants: { type: [productVariantSchema], default: [] },
    images: { type: [productImageSchema], default: [] },

    averageRating: {
      type: Number,
      default: 0,
      set: (v) => Math.round(v * 10) / 10,
    },
    numOfReviews: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

productSchema.virtual("finalPrice").get(function () {
  if (this.promotionalPrice && this.promotionalPrice < this.price) {
    return this.promotionalPrice;
  }
  if (this.oldPrice && this.oldPrice > this.price) {
    return this.price;
  }
  return this.price;
});

productSchema.virtual("totalStock").get(function () {
  if (!Array.isArray(this.variants)) return 0;
  return this.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
});

productSchema.index({ name: "text", description: "text" });
productSchema.index({ categoryId: 1 });

module.exports = mongoose.model("Product", productSchema);
