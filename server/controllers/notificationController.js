const Notification = require("../models/Notification"); // import model Notification để thao tác với collection notifications trong MongoDB

// ==============================
// GET /api/notifications/my/:userId
// Lấy toàn bộ thông báo của 1 người dùng
// ==============================
const getMyNotifications = async (req, res) => {
  try {
    const { userId } = req.params; // lấy userId từ URL, ví dụ /api/notifications/my/123

    if (!userId) {
      // nếu không có userId thì trả lỗi 400
      return res.status(400).json({
        message: "Thiếu userId",
      });
    }

    const notifications = await Notification.find({ user: userId }).sort({
      createdAt: -1, // sắp xếp thông báo mới nhất lên đầu
    });

    const unreadCount = notifications.filter((item) => !item.isRead).length; // đếm số thông báo chưa đọc

    return res.status(200).json({
      notifications, // danh sách toàn bộ thông báo của user
      unreadCount, // số lượng chưa đọc
      total: notifications.length, // tổng số thông báo
    });
  } catch (error) {
    console.log("GET MY NOTIFICATIONS ERROR:", error); // log lỗi ra terminal để debug
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách thông báo",
      error: error.message, // trả thêm message lỗi để dễ kiểm tra
    });
  }
};

// ==============================
// POST /api/notifications
// Tạo thông báo mới
// ==============================
const createNotification = async (req, res) => {
  try {
    const { user, title, content, type, link, meta } = req.body; // lấy dữ liệu từ body gửi lên

    if (!user) {
      // user là bắt buộc vì phải biết gửi thông báo cho ai
      return res.status(400).json({
        message: "Thiếu user",
      });
    }

    const notification = await Notification.create({
      user, // id người nhận thông báo
      title: title || "Thông báo", // nếu không có title thì gán mặc định
      content: content || "", // nếu không có nội dung thì cho chuỗi rỗng
      type: type || "other", // nếu không có loại thì mặc định là other
      link: link || "", // link điều hướng nếu có, ví dụ /profile hoặc /profile/orders
      meta: meta || {}, // dữ liệu phụ thêm nếu cần
      isRead: false, // thông báo mới tạo mặc định là chưa đọc
    });

    return res.status(201).json({
      message: "Tạo thông báo thành công",
      notification, // trả về thông báo vừa tạo
    });
  } catch (error) {
    console.log("CREATE NOTIFICATION ERROR:", error); // log lỗi
    return res.status(500).json({
      message: "Lỗi khi tạo thông báo",
      error: error.message,
    });
  }
};

// ==============================
// PATCH /api/notifications/:id/read
// Đánh dấu 1 thông báo là đã đọc
// ==============================
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params; // lấy id thông báo từ URL

    const notification = await Notification.findByIdAndUpdate(
      id, // tìm thông báo theo _id
      { isRead: true }, // cập nhật trạng thái thành đã đọc
      { new: true }, // trả về document mới sau khi update
    );

    if (!notification) {
      // nếu không tìm thấy thông báo
      return res.status(404).json({
        message: "Không tìm thấy thông báo",
      });
    }

    return res.status(200).json({
      message: "Đã đánh dấu thông báo là đã đọc",
      notification, // trả về thông báo sau khi cập nhật
    });
  } catch (error) {
    console.log("MARK NOTIFICATION AS READ ERROR:", error); // log lỗi
    return res.status(500).json({
      message: "Lỗi khi cập nhật trạng thái thông báo",
      error: error.message,
    });
  }
};

// ==============================
// PATCH /api/notifications/my/:userId/read-all
// Đánh dấu tất cả thông báo của user là đã đọc
// ==============================
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { userId } = req.params; // lấy userId từ URL

    if (!userId) {
      // kiểm tra nếu thiếu userId
      return res.status(400).json({
        message: "Thiếu userId",
      });
    }

    await Notification.updateMany(
      { user: userId, isRead: false }, // chỉ lấy thông báo của user này và đang chưa đọc
      { $set: { isRead: true } }, // cập nhật tất cả thành đã đọc
    );

    return res.status(200).json({
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
    });
  } catch (error) {
    console.log("MARK ALL NOTIFICATIONS AS READ ERROR:", error); // log lỗi
    return res.status(500).json({
      message: "Lỗi khi cập nhật tất cả thông báo",
      error: error.message,
    });
  }
};

// ==============================
// DELETE /api/notifications/:id
// Xóa 1 thông báo
// ==============================
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params; // lấy id thông báo từ URL

    const notification = await Notification.findByIdAndDelete(id); // tìm và xóa thông báo theo id

    if (!notification) {
      // nếu không tìm thấy thì trả 404
      return res.status(404).json({
        message: "Không tìm thấy thông báo",
      });
    }

    return res.status(200).json({
      message: "Xóa thông báo thành công",
    });
  } catch (error) {
    console.log("DELETE NOTIFICATION ERROR:", error); // log lỗi
    return res.status(500).json({
      message: "Lỗi khi xóa thông báo",
      error: error.message,
    });
  }
};

// export các hàm để file routes sử dụng
module.exports = {
  getMyNotifications, // lấy danh sách thông báo của user
  createNotification, // tạo thông báo mới
  markNotificationAsRead, // đánh dấu 1 thông báo là đã đọc
  markAllNotificationsAsRead, // đánh dấu tất cả thông báo là đã đọc
  deleteNotification, // xóa 1 thông báo
};
