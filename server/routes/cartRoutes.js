const express = require("express");
const router = express.Router();

const {
  getCartByUser,
  addToCart,
  updateCartItemQuantity,
  updateCartItemVariant,
  removeCartItem,
  removeCheckedItems,
  clearCart,
} = require("../controllers/cartController");

router.post("/add", addToCart);
router.patch("/update-quantity", updateCartItemQuantity);
router.patch("/update-variant", updateCartItemVariant);
router.delete("/remove", removeCartItem);
router.post("/remove-checked/:userId", removeCheckedItems);
router.delete("/clear/:userId", clearCart);
router.get("/:userId", getCartByUser);

module.exports = router;
