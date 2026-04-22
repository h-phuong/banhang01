const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

router.get("/stats", dashboardController.getStats);

router.get("/daily-orders", dashboardController.getDailyOrders);
router.get("/weekly-orders", dashboardController.getWeeklyOrders);
router.get("/monthly-orders", dashboardController.getMonthlyOrders);

router.get("/revenue-by-category", dashboardController.getRevenueByCategory);
router.get("/top-products", dashboardController.getTopProducts);
router.get("/revenue-by-payment", dashboardController.getRevenueByPayment);
router.get("/revenue-by-status", dashboardController.getRevenueByStatus);
router.get("/sold-by-category", dashboardController.getSoldByCategory);
module.exports = router;
