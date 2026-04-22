const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// ===== Public routes =====
router.get("/", productController.getAllProducts);
router.get("/search", productController.searchProducts);
router.get("/best-sellers", productController.getBestSellers);
router.get("/slug/:slug", productController.getProductBySlug);
router.get("/related/:id", productController.getRelatedProducts);
router.get("/variant/:variantId", productController.getProductByVariantId);
router.get("/:id", productController.getProductById);

// ===== Protected CRUD =====
router.post(
  "/",
  protect,
  authorizeRoles("admin", "manager"),
  productController.createProduct,
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "manager", "staff"),
  productController.updateProduct,
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "manager"),
  productController.deleteProduct,
);

module.exports = router;
