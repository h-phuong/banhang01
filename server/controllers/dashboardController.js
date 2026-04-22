const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const COLORS = [
  "#7F77DD",
  "#4BC0C0",
  "#FF9F40",
  "#36A2EB",
  "#1D9E75",
  "#E24B4A",
  "#B4B2A9",
  "#9966FF",
  "#FF6384",
  "#8BC34A",
];

const DELIVERED_STATUSES = ["Delivered"];
const REVENUE_STATUSES = ["Delivered"];
const LOST_REVENUE_STATUSES = ["Cancelled", "Returned"];

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // CN = 0
  const diff = day === 0 ? -6 : 1 - day; // tuần bắt đầu từ thứ 2
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfWeek = (date = new Date()) => {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfMonth = (year, monthIndex) => {
  return new Date(year, monthIndex, 1, 0, 0, 0, 0);
};

const endOfMonth = (year, monthIndex) => {
  return new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
};

const safeNumber = (v) => Number(v || 0);

const sumOrderRevenue = (orders) =>
  orders.reduce((sum, order) => sum + safeNumber(order.finalAmount), 0);

const buildColor = (index) => COLORS[index % COLORS.length];

// ==============================
// TỔNG QUAN
// ==============================
exports.getStats = async (req, res) => {
  try {
    const [orders, users, products, revenueAgg] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments(),
      Product.countDocuments(),
      Order.aggregate([
        {
          $match: {
            status: { $in: DELIVERED_STATUSES },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$finalAmount" },
          },
        },
      ]),
    ]);

    const revenue = revenueAgg?.[0]?.totalRevenue || 0;

    return res.json({
      success: true,
      stats: {
        orders,
        revenue,
        users,
        products,
      },
    });
  } catch (error) {
    console.error("getStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy thống kê dashboard",
      error: error.message,
    });
  }
};

// ==============================
// ĐƠN HÀNG THEO NGÀY
// Hôm nay vs hôm qua (8h -> 20h)
// ==============================
exports.getDailyOrders = async (req, res) => {
  try {
    const timezone = "Asia/Ho_Chi_Minh";
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [todayAgg, yesterdayAgg] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart, $lt: tomorrowStart },
          },
        },
        {
          $group: {
            _id: {
              $hour: {
                date: "$createdAt",
                timezone,
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: yesterdayStart, $lt: todayStart },
          },
        },
        {
          $group: {
            _id: {
              $hour: {
                date: "$createdAt",
                timezone,
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const todayMap = new Map(todayAgg.map((item) => [item._id, item.count]));
    const yesterdayMap = new Map(
      yesterdayAgg.map((item) => [item._id, item.count]),
    );

    const current = hours.map((hour) => todayMap.get(hour) || 0);
    const prev = hours.map((hour) => yesterdayMap.get(hour) || 0);

    return res.json({
      success: true,
      current,
      prev,
    });
  } catch (error) {
    console.error("getDailyOrders error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy dữ liệu đơn hàng theo ngày",
      error: error.message,
    });
  }
};

// ==============================
// ĐƠN HÀNG THEO TUẦN
// tuần này vs tuần trước
// ==============================
exports.getWeeklyOrders = async (req, res) => {
  try {
    const thisWeekStart = startOfWeek();
    const thisWeekEnd = endOfWeek();

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(thisWeekEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const [thisWeekOrders, lastWeekOrders] = await Promise.all([
      Order.find({
        createdAt: { $gte: thisWeekStart, $lte: thisWeekEnd },
      }).select("createdAt"),
      Order.find({
        createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd },
      }).select("createdAt"),
    ]);

    const current = Array.from({ length: 7 }, (_, index) => {
      const dayDate = new Date(thisWeekStart);
      dayDate.setDate(dayDate.getDate() + index);
      const dayStart = startOfDay(dayDate);
      const dayEnd = endOfDay(dayDate);

      return thisWeekOrders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt >= dayStart && createdAt <= dayEnd;
      }).length;
    });

    const prev = Array.from({ length: 7 }, (_, index) => {
      const dayDate = new Date(lastWeekStart);
      dayDate.setDate(dayDate.getDate() + index);
      const dayStart = startOfDay(dayDate);
      const dayEnd = endOfDay(dayDate);

      return lastWeekOrders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt >= dayStart && createdAt <= dayEnd;
      }).length;
    });

    return res.json({
      success: true,
      current,
      prev,
    });
  } catch (error) {
    console.error("getWeeklyOrders error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy dữ liệu đơn hàng theo tuần",
      error: error.message,
    });
  }
};

// ==============================
// ĐƠN HÀNG THEO THÁNG
// năm nay vs năm trước
// ==============================
exports.getMonthlyOrders = async (req, res) => {
  try {
    const now = new Date();
    const thisYear = now.getFullYear();
    const lastYear = thisYear - 1;

    const [thisYearOrders, lastYearOrders] = await Promise.all([
      Order.find({
        createdAt: {
          $gte: new Date(thisYear, 0, 1, 0, 0, 0, 0),
          $lte: new Date(thisYear, 11, 31, 23, 59, 59, 999),
        },
      }).select("createdAt"),
      Order.find({
        createdAt: {
          $gte: new Date(lastYear, 0, 1, 0, 0, 0, 0),
          $lte: new Date(lastYear, 11, 31, 23, 59, 59, 999),
        },
      }).select("createdAt"),
    ]);

    const current = Array.from({ length: 12 }, (_, monthIndex) => {
      const mStart = startOfMonth(thisYear, monthIndex);
      const mEnd = endOfMonth(thisYear, monthIndex);
      return thisYearOrders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt >= mStart && createdAt <= mEnd;
      }).length;
    });

    const prev = Array.from({ length: 12 }, (_, monthIndex) => {
      const mStart = startOfMonth(lastYear, monthIndex);
      const mEnd = endOfMonth(lastYear, monthIndex);
      return lastYearOrders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return createdAt >= mStart && createdAt <= mEnd;
      }).length;
    });

    return res.json({
      success: true,
      current,
      prev,
    });
  } catch (error) {
    console.error("getMonthlyOrders error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy dữ liệu đơn hàng theo tháng",
      error: error.message,
    });
  }
};

// ==============================
// DOANH THU THEO DANH MỤC
// Chỉ tính đơn Delivered
// Cần Product có category/categoryId/categoryName
// ==============================
exports.getRevenueByCategory = async (req, res) => {
  try {
    const deliveredOrders = await Order.find({
      status: { $in: REVENUE_STATUSES },
    }).populate({
      path: "details.productId",
      select: "name categoryId",
      populate: {
        path: "categoryId",
        select: "name",
      },
    });

    const categoryMap = new Map();

    deliveredOrders.forEach((order) => {
      (order.details || []).forEach((item) => {
        const revenue = safeNumber(item.unitPrice) * safeNumber(item.quantity);
        const product = item.productId || {};

        const rawName =
          item?.categoryName || product?.categoryId?.name || "Chưa phân loại";

        const categoryName =
          typeof rawName === "string" && rawName.trim()
            ? rawName.trim()
            : "Chưa phân loại";

        categoryMap.set(
          categoryName,
          (categoryMap.get(categoryName) || 0) + revenue,
        );
      });
    });

    const data = Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: buildColor(index),
      }))
      .sort((a, b) => b.value - a.value);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("getRevenueByCategory error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy doanh thu theo danh mục",
      error: error.message,
    });
  }
};

// ==============================
// TOP SẢN PHẨM THEO DOANH THU
// Chỉ tính đơn Delivered
// ==============================
exports.getTopProducts = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(10, Number(req.query.limit || 5)));

    const deliveredOrders = await Order.find({
      status: { $in: REVENUE_STATUSES },
    }).select("details");

    const productMap = new Map();

    deliveredOrders.forEach((order) => {
      (order.details || []).forEach((item) => {
        const key =
          String(item.productId || "") ||
          item.sku ||
          item.productName ||
          "unknown";

        const current = productMap.get(key) || {
          name: item.productName || "Sản phẩm",
          revenue: 0,
          quantity: 0,
        };

        current.revenue +=
          safeNumber(item.unitPrice) * safeNumber(item.quantity);
        current.quantity += safeNumber(item.quantity);

        productMap.set(key, current);
      });
    });

    const data = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("getTopProducts error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy top sản phẩm",
      error: error.message,
    });
  }
};

// ==============================
// DOANH THU THEO PHƯƠNG THỨC THANH TOÁN
// Chỉ tính đơn Delivered
// ==============================
exports.getRevenueByPayment = async (req, res) => {
  try {
    const deliveredOrders = await Order.find({
      status: { $in: REVENUE_STATUSES },
    }).select("paymentMethod finalAmount");

    const paymentMap = new Map();

    deliveredOrders.forEach((order) => {
      const paymentMethod = String(order.paymentMethod || "COD").toUpperCase();
      paymentMap.set(
        paymentMethod,
        (paymentMap.get(paymentMethod) || 0) + safeNumber(order.finalAmount),
      );
    });

    const paymentLabels = {
      COD: "COD",
      MOMO: "MOMO",
      VNPAY: "VNPAY",
      BANKING: "Chuyển khoản",
    };

    const data = Array.from(paymentMap.entries())
      .map(([key, value], index) => ({
        name: paymentLabels[key] || key,
        value,
        color: buildColor(index),
      }))
      .sort((a, b) => b.value - a.value);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("getRevenueByPayment error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy doanh thu theo phương thức thanh toán",
      error: error.message,
    });
  }
};

// ==============================
// DOANH THU THEO TRẠNG THÁI ĐƠN
// Delivered: doanh thu thành công
// Cancelled/Returned: doanh thu thất thoát tham chiếu
// ==============================
exports.getRevenueByStatus = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: [...REVENUE_STATUSES, ...LOST_REVENUE_STATUSES] },
    }).select("status finalAmount");

    const statusMap = new Map();

    orders.forEach((order) => {
      const key = String(order.status || "");
      statusMap.set(
        key,
        (statusMap.get(key) || 0) + safeNumber(order.finalAmount),
      );
    });

    const labelMap = {
      Delivered: { name: "Đã giao", color: "#1D9E75" },
      Cancelled: { name: "Đã hủy", color: "#E24B4A" },
      Returned: { name: "Hoàn trả", color: "#B4B2A9" },
    };

    const orderedStatuses = ["Delivered", "Cancelled", "Returned"];

    const data = orderedStatuses
      .filter((status) => statusMap.has(status))
      .map((status) => ({
        name: labelMap[status].name,
        value: statusMap.get(status) || 0,
        color: labelMap[status].color,
      }));

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("getRevenueByStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy doanh thu theo trạng thái đơn",
      error: error.message,
    });
  }
};
// ==============================
// SỐ LƯỢNG BÁN THEO DANH MỤC
// Chỉ tính đơn Delivered
// ==============================
exports.getSoldByCategory = async (req, res) => {
  try {
    // Lấy tất cả đơn đã giao thành công
    // REVENUE_STATUSES của bạn hiện đang là ["Delivered"]
    const deliveredOrders = await Order.find({
      status: { $in: REVENUE_STATUSES },
    }).populate({
      // Populate từ details.productId sang bảng Product
      path: "details.productId",

      // Chỉ lấy các field cần thiết từ Product
      select: "name categoryId",

      // Từ Product tiếp tục populate categoryId sang bảng Category
      populate: {
        path: "categoryId",
        select: "name",
      },
    });

    // Dùng Map để cộng dồn số lượng theo từng danh mục
    // Ví dụ:
    // "Áo thun" => 120
    // "Quần jean" => 80
    const categoryMap = new Map();

    // Duyệt từng đơn hàng
    deliveredOrders.forEach((order) => {
      // Trong mỗi đơn, duyệt từng sản phẩm chi tiết
      (order.details || []).forEach((item) => {
        // Lấy số lượng của sản phẩm trong đơn
        const quantity = safeNumber(item.quantity);

        // Lấy product đã populate
        const product = item.productId || {};

        // Ưu tiên lấy tên danh mục theo thứ tự:
        // 1. categoryName đã snapshot trong order detail
        // 2. categoryId.name từ bảng Product -> Category
        // 3. nếu không có thì gán "Chưa phân loại"
        const rawName =
          item?.categoryName || product?.categoryId?.name || "Chưa phân loại";

        // Chuẩn hóa tên danh mục:
        // nếu là chuỗi hợp lệ thì trim() bỏ khoảng trắng thừa
        // nếu rỗng thì fallback về "Chưa phân loại"
        const categoryName =
          typeof rawName === "string" && rawName.trim()
            ? rawName.trim()
            : "Chưa phân loại";

        // Cộng dồn số lượng vào Map
        // Nếu danh mục chưa có thì lấy 0 trước rồi cộng thêm quantity
        categoryMap.set(
          categoryName,
          (categoryMap.get(categoryName) || 0) + quantity,
        );
      });
    });

    // Chuyển Map sang mảng để frontend dễ dùng
    const data = Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        // Tên danh mục
        name,

        // Tổng số lượng bán của danh mục đó
        value,

        // Màu hiển thị chart
        color: buildColor(index),
      }))
      // Sắp xếp giảm dần: danh mục bán nhiều đứng trước
      .sort((a, b) => b.value - a.value);

    // Trả dữ liệu về frontend
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    // Nếu có lỗi thì log ra terminal
    console.error("getSoldByCategory error:", error);

    // Trả response lỗi cho frontend
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy số lượng bán theo danh mục",
      error: error.message,
    });
  }
};
