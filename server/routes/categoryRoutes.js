const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "manager"),
  categoryController.createCategory,
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "manager"),
  categoryController.updateCategory,
);
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "manager"),
  categoryController.deleteCategory,
);

module.exports = router;
