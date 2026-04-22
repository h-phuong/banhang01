const express = require("express");
const router = express.Router();
const User = require("../models/User");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// 1. Lấy danh sách Users (admin, manager)
router.get(
  "/",
  protect,
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        role = "",
        status = "",
      } = req.query;

      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;

      let query = {};

      if (search) {
        query.$or = [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
        ];
      }

      if (role) {
        query.role = role.toLowerCase();
      }

      if (status === "active") {
        query.isLocked = false;
      } else if (status === "locked") {
        query.isLocked = true;
      }

      const users = await User.find(query)
        .limit(limitNumber)
        .skip((pageNumber - 1) * limitNumber)
        .sort({ isLocked: 1, createdAt: -1 })
        .select("-password");

      const count = await User.countDocuments(query);

      res.json({
        docs: users,
        totalPages: Math.ceil(count / limitNumber),
        page: pageNumber,
        totalDocs: count,
        limit: limitNumber,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// 1.1 Lấy chi tiết 1 user
// admin, manager xem mọi user
// user thường chỉ xem được chính mình
router.get("/:id", protect, async (req, res) => {
  try {
    const isAdminOrManager = ["admin", "manager"].includes(req.user.role);
    const isSelf = String(req.user._id) === String(req.params.id);

    if (!isAdminOrManager && !isSelf) {
      return res.status(403).json({ message: "Bạn không có quyền truy cập" });
    }

    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy User" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Tạo User mới
// admin, manager được tạo
// manager không được tạo admin
router.post(
  "/",
  protect,
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const {
        username,
        email,
        password,
        role,
        fullName,
        phoneNumber,
        address,
      } = req.body;

      if (!email || !password || !username) {
        return res
          .status(400)
          .json({ message: "Vui lòng nhập Username, Email và Mật khẩu!" });
      }

      const normalizedRole = role ? String(role).toLowerCase() : "customer";

      if (req.user.role === "manager" && normalizedRole === "admin") {
        return res
          .status(403)
          .json({ message: "Manager không được tạo tài khoản admin" });
      }

      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      if (userExists) {
        return res
          .status(400)
          .json({ message: "Username hoặc Email đã tồn tại!" });
      }

      const newUser = new User({
        username,
        email,
        password,
        role: normalizedRole,
        fullName,
        phoneNumber,
        address,
        isLocked: false,
      });

      const savedUser = await newUser.save();
      const safeUser = savedUser.toObject();
      delete safeUser.password;

      res.status(201).json(safeUser);
    } catch (err) {
      console.error("Lỗi tạo user:", err);
      res.status(400).json({ message: "Lỗi tạo User: " + err.message });
    }
  },
);

// 3. Cập nhật User
// admin, manager được sửa
// manager không được sửa admin và không được cấp quyền admin
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "manager"),
  async (req, res) => {
    try {
      const {
        fullName,
        phoneNumber,
        avatarUrl,
        password,
        role,
        email,
        address,
      } = req.body;

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User không tồn tại" });
      }

      const normalizedRole =
        role !== undefined ? String(role).toLowerCase() : undefined;

      if (req.user.role === "manager") {
        if (user.role === "admin") {
          return res
            .status(403)
            .json({ message: "Manager không được sửa tài khoản admin" });
        }

        if (normalizedRole === "admin") {
          return res
            .status(403)
            .json({ message: "Manager không được cấp quyền admin" });
        }
      }

      if (fullName !== undefined) user.fullName = fullName;
      if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
      if (email !== undefined) user.email = email;
      if (address !== undefined) user.address = address;
      if (normalizedRole !== undefined) user.role = normalizedRole;

      if (password && password.trim() !== "") {
        user.password = password;
      }

      const updatedUser = await user.save();

      const safeUser = updatedUser.toObject();
      delete safeUser.password;

      res.json(safeUser);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  },
);

// 4. Khóa / Mở khóa User
// chỉ admin
router.delete("/:id", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy User" });
    }

    user.isLocked = !user.isLocked;
    await user.save();

    res.json({
      message: user.isLocked
        ? "Đã khóa tài khoản thành công"
        : "Đã mở khóa tài khoản thành công",
      data: {
        _id: user._id,
        isLocked: user.isLocked,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
