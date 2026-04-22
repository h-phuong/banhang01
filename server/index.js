const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

dotenv.config({
  override: true,
  path: require("path").resolve(__dirname, ".env"),
});

const app = express();

// Debug: xác nhận .env đã load
console.log("✅ ENV loaded:", {
  MONGO_URI: process.env.MONGO_URI ? "✓" : "❌ MISSING",
  MOMO_PARTNER_CODE: process.env.MOMO_PARTNER_CODE || "❌ MISSING",
  VNP_TMN_CODE: process.env.VNP_TMN_CODE || "❌ MISSING",
  VNP_HASH_SECRET: process.env.VNP_HASH_SECRET ? "✓" : "❌ MISSING",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "✓" : "❌ MISSING",
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID ? "✓" : "❌ MISSING",
});

// --- Import Routes ---
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const uploadRoutes = require("./routes/uploadRoutes"); // Img Upload
const couponRoutes = require("./routes/couponRoutes");
const orderRoutes = require("./routes/orderRoutes");
const chatRoutes = require("./routes/chatRoutes"); //ChatBox
const postRoutes = require("./routes/postRoutes");
const postCategoryRoutes = require("./routes/postCategoryRoutes");
const contactRoutes = require("./routes/contactRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const addressRoutes = require("./routes/addressRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const momoRoutes = require("./routes/momoRoutes");
const vnpayRoutes = require("./routes/vnpayRoutes");
// Kết nối Database
connectDB();

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static Folder ---
// app.use("/uploads", express.static(path.join(__dirname, "/uploads"))); // Removed since using Cloudinary

// --- Routes ---
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/post-categories", postCategoryRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/momo", momoRoutes);
app.use("/api/payment", vnpayRoutes);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Server error",
  });
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});
