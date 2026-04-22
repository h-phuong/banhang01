const Cart = require("../models/Cart");
const Product = require("../models/Product");
const mongoose = require("mongoose");

function normalizeCart(cart) {
  if (!cart) {
    return {
      items: [],
      totalQuantity: 0,
    };
  }

  return {
    _id: cart._id,
    userId: cart.userId,
    items: Array.isArray(cart.items) ? cart.items : [],
    totalQuantity: Number(cart.totalQuantity || 0),
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
}

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

function getVariantStock(variant) {
  if (!variant) return 0;

  return Number(variant.stock ?? variant.quantity ?? variant.inventory ?? 0);
}

async function getOrCreateCart(userId) {
  const objectUserId = toObjectId(userId);

  const cart = await Cart.findOneAndUpdate(
    { userId: objectUserId },
    {
      $setOnInsert: {
        userId: objectUserId,
        items: [],
        totalQuantity: 0,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return cart;
}

async function populateCart(cartId) {
  return Cart.findById(cartId).populate({
    path: "items.productId",
    populate: [
      { path: "variants.color", select: "name hexCode" },
      { path: "variants.size", select: "name" },
      { path: "categoryId", select: "name slug" },
    ],
  });
}

// =========================
// GET CART BY USER
// =========================
exports.getCartByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    const cart = await getOrCreateCart(userId);
    const populated = await populateCart(cart._id);

    return res.json(normalizeCart(populated));
  } catch (error) {
    console.error("getCartByUser error:", error);
    console.error(error.stack);
    return res.status(500).json({ message: error.message });
  }
};

// =========================
// ADD TO CART
// =========================
exports.addToCart = async (req, res) => {
  try {
    console.log("addToCart body:", req.body);

    const { userId, productId, variantId, quantity } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "productId không hợp lệ" });
    }

    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: "variantId không hợp lệ" });
    }

    const qty = Math.max(1, Number(quantity || 1));

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    if (product.status && String(product.status).toUpperCase() !== "ACTIVE") {
      return res.status(400).json({ message: "Sản phẩm đã ngừng bán" });
    }

    const variant = Array.isArray(product.variants)
      ? product.variants.id(variantId)
      : null;

    if (!variant) {
      return res.status(404).json({
        message: "Không tìm thấy biến thể sản phẩm",
      });
    }

    const stock = getVariantStock(variant);

    if (stock <= 0) {
      return res.status(400).json({ message: "Sản phẩm đã hết hàng" });
    }

    const cart = await getOrCreateCart(userId);

    const existingItem = cart.items.find(
      (item) =>
        String(item.productId) === String(productId) &&
        String(item.variantId) === String(variantId),
    );

    if (existingItem) {
      const nextQty = Number(existingItem.quantity || 0) + qty;

      if (nextQty > stock) {
        return res.status(400).json({
          message: `Số lượng vượt quá tồn kho. Chỉ còn ${stock} sản phẩm`,
        });
      }

      existingItem.quantity = nextQty;
    } else {
      if (qty > stock) {
        return res.status(400).json({
          message: `Số lượng vượt quá tồn kho. Chỉ còn ${stock} sản phẩm`,
        });
      }

      cart.items.push({
        productId,
        variantId,
        quantity: qty,
      });
    }

    cart.totalQuantity = cart.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    await cart.save();

    const populated = await populateCart(cart._id);
    return res.json(normalizeCart(populated));
  } catch (error) {
    console.error("addToCart error:", error);
    console.error(error.stack);
    return res.status(500).json({
      message: error.message || "Lỗi server khi thêm vào giỏ hàng",
    });
  }
};

// =========================
// UPDATE CART ITEM QUANTITY
// =========================
exports.updateCartItemQuantity = async (req, res) => {
  try {
    const { userId, itemId, productId, variantId, quantity } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    const qty = Math.max(1, Number(quantity || 1));

    const cart = await Cart.findOne({ userId: toObjectId(userId) });
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    let item = null;

    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      item = cart.items.id(itemId);
    }

    if (!item && productId && variantId) {
      item = cart.items.find(
        (it) =>
          String(it.productId) === String(productId) &&
          String(it.variantId) === String(variantId),
      );
    }

    if (!item) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm trong giỏ",
      });
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    if (product.status && String(product.status).toUpperCase() !== "ACTIVE") {
      return res.status(400).json({ message: "Sản phẩm đã ngừng bán" });
    }

    const variant = Array.isArray(product.variants)
      ? product.variants.id(item.variantId)
      : null;

    if (!variant) {
      return res.status(404).json({
        message: "Biến thể sản phẩm không tồn tại",
      });
    }

    const stock = getVariantStock(variant);

    if (stock <= 0) {
      return res.status(400).json({ message: "Sản phẩm đã hết hàng" });
    }

    if (qty > stock) {
      return res.status(400).json({
        message: `Số lượng vượt quá tồn kho. Chỉ còn ${stock} sản phẩm`,
      });
    }

    item.quantity = qty;

    cart.totalQuantity = cart.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    await cart.save();

    const populated = await populateCart(cart._id);
    return res.json(normalizeCart(populated));
  } catch (error) {
    console.error("updateCartItemQuantity error:", error);
    console.error(error.stack);
    return res.status(500).json({ message: error.message });
  }
};

// =========================
// UPDATE CART ITEM VARIANT
// =========================
exports.updateCartItemVariant = async (req, res) => {
  try {
    const { userId, itemId, productId, oldVariantId, newVariantId } =
      req.body || {};

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    if (!mongoose.Types.ObjectId.isValid(newVariantId)) {
      return res.status(400).json({ message: "newVariantId không hợp lệ" });
    }

    const cart = await Cart.findOne({ userId: toObjectId(userId) });
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    let item = null;

    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      item = cart.items.id(itemId);
    }

    if (!item && productId && oldVariantId) {
      item = cart.items.find(
        (it) =>
          String(it.productId) === String(productId) &&
          String(it.variantId) === String(oldVariantId),
      );
    }

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy item trong giỏ" });
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    if (product.status && String(product.status).toUpperCase() !== "ACTIVE") {
      return res.status(400).json({ message: "Sản phẩm đã ngừng bán" });
    }

    const nextVariant = Array.isArray(product.variants)
      ? product.variants.id(newVariantId)
      : null;

    if (!nextVariant) {
      return res.status(404).json({ message: "Biến thể mới không tồn tại" });
    }

    const stock = getVariantStock(nextVariant);

    if (stock <= 0) {
      return res.status(400).json({ message: "Biến thể mới đã hết hàng" });
    }

    if (Number(item.quantity || 1) > stock) {
      return res.status(400).json({
        message: `Biến thể mới không đủ tồn kho. Chỉ còn ${stock} sản phẩm`,
      });
    }

    const duplicateItem = cart.items.find(
      (it) =>
        String(it._id) !== String(item._id) &&
        String(it.productId) === String(item.productId) &&
        String(it.variantId) === String(newVariantId),
    );

    if (duplicateItem) {
      const mergedQty =
        Number(duplicateItem.quantity || 0) + Number(item.quantity || 0);

      if (mergedQty > stock) {
        return res.status(400).json({
          message: `Gộp sản phẩm vượt quá tồn kho. Chỉ còn ${stock} sản phẩm`,
        });
      }

      duplicateItem.quantity = mergedQty;
      item.deleteOne();
    } else {
      item.variantId = newVariantId;
    }

    cart.totalQuantity = cart.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    await cart.save();

    const populated = await populateCart(cart._id);
    return res.json(normalizeCart(populated));
  } catch (error) {
    console.error("updateCartItemVariant error:", error);
    console.error(error.stack);
    return res.status(500).json({ message: error.message });
  }
};

// =========================
// REMOVE CART ITEM
// =========================
exports.removeCartItem = async (req, res) => {
  try {
    const { userId, itemId, productId, variantId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    const cart = await Cart.findOne({ userId: toObjectId(userId) });
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    let removed = false;

    if (itemId && mongoose.Types.ObjectId.isValid(itemId)) {
      const item = cart.items.id(itemId);
      if (item) {
        item.deleteOne();
        removed = true;
      }
    }

    if (!removed && productId && variantId) {
      const idx = cart.items.findIndex(
        (it) =>
          String(it.productId) === String(productId) &&
          String(it.variantId) === String(variantId),
      );

      if (idx >= 0) {
        cart.items.splice(idx, 1);
        removed = true;
      }
    }

    if (!removed) {
      return res.status(404).json({ message: "Không tìm thấy item cần xóa" });
    }

    cart.totalQuantity = cart.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    await cart.save();

    const populated = await populateCart(cart._id);
    return res.json(normalizeCart(populated));
  } catch (error) {
    console.error("removeCartItem error:", error);
    console.error(error.stack);
    return res.status(500).json({ message: error.message });
  }
};

// =========================
// REMOVE CHECKED ITEMS
// Xóa đúng các sản phẩm vừa thanh toán
// =========================
exports.removeCheckedItems = async (req, res) => {
  try {
    const { userId } = req.params;
    const { items } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Không có sản phẩm cần xóa khỏi giỏ hàng",
      });
    }

    const cart = await Cart.findOne({ userId: toObjectId(userId) });

    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    const beforeCount = cart.items.length;

    cart.items = (cart.items || []).filter((cartItem) => {
      const matched = items.some(
        (item) =>
          String(item.productId || "") === String(cartItem.productId || "") &&
          String(item.variantId || "") === String(cartItem.variantId || ""),
      );

      return !matched;
    });

    const afterCount = cart.items.length;

    cart.totalQuantity = cart.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    cart.markModified("items");
    cart.markModified("totalQuantity");

    await cart.save();

    console.log("removeCheckedItems:", {
      userId,
      requestItems: items,
      beforeCount,
      afterCount,
      totalQuantity: cart.totalQuantity,
    });

    const populated = await populateCart(cart._id);
    return res.json({
      message: "Đã xóa các sản phẩm đã thanh toán khỏi giỏ hàng",
      ...normalizeCart(populated),
    });
  } catch (error) {
    console.error("removeCheckedItems error:", error);
    console.error(error.stack);
    return res.status(500).json({ message: error.message });
  }
};

// =========================
// CLEAR CART
// =========================
exports.clearCart = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    const cart = await getOrCreateCart(userId);
    cart.items = [];
    cart.totalQuantity = 0;
    cart.markModified("items");
    cart.markModified("totalQuantity");

    await cart.save();

    const populated = await populateCart(cart._id);
    return res.json(normalizeCart(populated));
  } catch (error) {
    console.error("clearCart error:", error);
    console.error(error.stack);
    return res.status(500).json({ message: error.message });
  }
};
