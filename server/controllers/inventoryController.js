const Product = require("../models/Product");
const Category = require("../models/Category");
const mongoose = require("mongoose");

require("../models/MasterData");

const Color = mongoose.model("Color");
const Size = mongoose.model("Size");

// tạm lưu lịch sử trong RAM
// sau này bạn có thể chuyển sang Mongo model riêng
global.inventoryLogs = global.inventoryLogs || [];

function toObjectId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function safeNumber(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSearch(text = "") {
  return String(text || "")
    .trim()
    .toLowerCase();
}

async function getCategoryMap() {
  const categories = await Category.find().select("_id name");
  return new Map(categories.map((c) => [String(c._id), c.name]));
}

async function getColorMap(ids = []) {
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!validIds.length) return new Map();

  const docs = await Color.find({ _id: { $in: validIds } }).select("_id name");
  return new Map(docs.map((d) => [String(d._id), d.name]));
}

async function getSizeMap(ids = []) {
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!validIds.length) return new Map();

  const docs = await Size.find({ _id: { $in: validIds } }).select("_id name");
  return new Map(docs.map((d) => [String(d._id), d.name]));
}

exports.getInventory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const search = normalizeSearch(req.query.search);
    const lowStockOnly =
      String(req.query.lowStock || "") === "1" ||
      String(req.query.lowStock || "").toLowerCase() === "true";

    const products = await Product.find()
      .populate("categoryId", "name")
      .populate("variants.color", "name")
      .populate("variants.size", "name")
      .sort({ createdAt: -1 });

    let items = [];

    products.forEach((product) => {
      const productId = String(product._id);
      const productName = product.name || "";
      const categoryName =
        product.categoryId?.name ||
        (typeof product.categoryId === "string" ? product.categoryId : "");

      const variants = Array.isArray(product.variants) ? product.variants : [];

      if (!variants.length) {
        items.push({
          productId,
          variantId: null,
          name: productName,
          sku: "",
          category: categoryName,
          stock: safeNumber(product.quantity || 0),
          sold: 0,
          minStock: 5,
          updatedAt: product.updatedAt,
        });
        return;
      }

      variants.forEach((variant) => {
        const stock = safeNumber(variant.quantity || 0);
        const colorName =
          variant.color?.name ||
          (typeof variant.color === "string" ? variant.color : "");
        const sizeName =
          variant.size?.name ||
          (typeof variant.size === "string" ? variant.size : "");

        items.push({
          productId,
          variantId: variant._id ? String(variant._id) : null,
          name:
            [productName, colorName, sizeName].filter(Boolean).join(" - ") ||
            productName,
          sku: variant.sku || "",
          category: categoryName,
          stock,
          sold: 0,
          minStock: 5,
          updatedAt: variant.updatedAt || product.updatedAt,
        });
      });
    });

    if (search) {
      items = items.filter((item) => {
        return (
          String(item.name || "")
            .toLowerCase()
            .includes(search) ||
          String(item.sku || "")
            .toLowerCase()
            .includes(search) ||
          String(item.category || "")
            .toLowerCase()
            .includes(search)
        );
      });
    }

    if (lowStockOnly) {
      items = items.filter(
        (item) => Number(item.stock || 0) <= Number(item.minStock || 5),
      );
    }

    const total = items.length;
    const start = (page - 1) * limit;
    const pagedItems = items.slice(start, start + limit);

    res.json({
      success: true,
      items: pagedItems,
      total,
      page,
      limit,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy tồn kho",
      error: error.message,
    });
  }
};

exports.adjustInventory = async (req, res) => {
  try {
    const { productId, variantId, type, quantity, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "productId không hợp lệ",
      });
    }

    const qty = safeNumber(quantity, 0);
    if (qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng phải lớn hơn 0",
      });
    }

    if (!["IN", "OUT", "ADJUST"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type phải là IN, OUT hoặc ADJUST",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    let targetVariant = null;

    if (variantId) {
      targetVariant = product.variants.id(variantId);

      if (!targetVariant) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy biến thể sản phẩm",
        });
      }
    } else if (
      Array.isArray(product.variants) &&
      product.variants.length === 1
    ) {
      targetVariant = product.variants[0];
    } else if (Array.isArray(product.variants) && product.variants.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm có nhiều biến thể, cần truyền variantId",
      });
    }

    let beforeQty = 0;
    let afterQty = 0;

    if (targetVariant) {
      beforeQty = safeNumber(targetVariant.quantity, 0);

      if (type === "IN") afterQty = beforeQty + qty;
      if (type === "OUT") afterQty = beforeQty - qty;
      if (type === "ADJUST") afterQty = qty;

      if (afterQty < 0) {
        return res.status(400).json({
          success: false,
          message: "Tồn kho không đủ để xuất",
        });
      }

      targetVariant.quantity = afterQty;
    } else {
      beforeQty = safeNumber(product.quantity, 0);

      if (type === "IN") afterQty = beforeQty + qty;
      if (type === "OUT") afterQty = beforeQty - qty;
      if (type === "ADJUST") afterQty = qty;

      if (afterQty < 0) {
        return res.status(400).json({
          success: false,
          message: "Tồn kho không đủ để xuất",
        });
      }

      product.quantity = afterQty;
    }

    await product.save();

    global.inventoryLogs.unshift({
      _id: new mongoose.Types.ObjectId().toString(),
      productId: String(product._id),
      variantId: targetVariant?._id ? String(targetVariant._id) : null,
      type,
      quantity: qty,
      beforeQty,
      afterQty,
      note: String(note || "").trim(),
      createdAt: new Date(),
    });

    res.json({
      success: true,
      message: "Cập nhật tồn kho thành công",
      data: {
        productId: String(product._id),
        variantId: targetVariant?._id ? String(targetVariant._id) : null,
        beforeQty,
        afterQty,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi cập nhật tồn kho",
      error: error.message,
    });
  }
};

exports.getInventoryHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const { productId } = req.query;

    let logs = [...global.inventoryLogs];

    if (productId) {
      logs = logs.filter((x) => String(x.productId) === String(productId));
    }

    logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = logs.length;
    const start = (page - 1) * limit;
    const items = logs.slice(start, start + limit);

    res.json({
      success: true,
      items,
      total,
      page,
      limit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi lấy lịch sử tồn kho",
      error: error.message,
    });
  }
};
