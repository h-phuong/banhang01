const express = require("express");
const router = express.Router();

const {
  getAllReviews,
  getReviewsByProduct,
  checkReviewPermission,
  createReview,
  replyReview,
  approveReview,
  rejectReview,
  deleteReview,
} = require("../controllers/reviewController");

router.get("/", getAllReviews);

router.get("/check/:productId", checkReviewPermission);

router.get("/product/:productId", getReviewsByProduct);

router.post("/", createReview);

router.put("/:id/reply", replyReview);

router.put("/:id/approve", approveReview);

router.put("/:id/reject", rejectReview);

router.delete("/:id", deleteReview);

module.exports = router;
