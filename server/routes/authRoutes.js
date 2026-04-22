const express = require("express");
const router = express.Router();

const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { createRemoteJWKSet, jwtVerify } = require("jose");

const { protect } = require("../middleware/authMiddleware");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

// Hàm tạo username duy nhất khi đăng nhập social lần đầu
const generateUniqueUsername = async (baseName) => {
  let username = (baseName || "user").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!username) username = "user";

  let finalUsername = username;
  let count = 0;

  while (await User.findOne({ username: finalUsername })) {
    count++;
    finalUsername = `${username}${Date.now()}${count}`;
  }

  return finalUsername;
};

// Hàm tạo mật khẩu ngẫu nhiên cho tài khoản social login
const generateRandomPassword = () => {
  return "social_" + Math.random().toString(36).slice(2) + Date.now();
};

// =========================
// ĐĂNG KÝ
// POST /register
// =========================
router.post("/register", async (req, res) => {
  console.log("--- BẮT ĐẦU ĐĂNG KÝ ---");
  console.log("Dữ liệu nhận được:", req.body);

  try {
    const { username, email, password, fullName } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đủ Username, Email và Password!" });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: "Email này đã được sử dụng!" });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại!" });
    }

    const user = await User.create({
      username,
      email,
      password,
      fullName,
      role: "customer",
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
      message: "Đăng ký thành công!",
    });
  } catch (error) {
    res.status(500).json({
      message: "Lỗi Server: " + (error.message || "Không xác định"),
      error: error.message,
    });
  }
});

// =========================
// ĐĂNG NHẬP
// POST /login
// =========================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user?.isLocked) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    if (user && (await user.matchPassword(password))) {
      return res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        token: generateToken(user._id),
      });
    }

    return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// =========================
// ĐĂNG NHẬP GOOGLE
// POST /google
// =========================
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Thiếu credential Google" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const googleId = payload.sub;
    const email = payload.email;
    const fullName = payload.name || "";
    const avatarUrl = payload.picture || "";

    if (!email) {
      return res
        .status(400)
        .json({ message: "Không lấy được email từ Google" });
    }

    let user = await User.findOne({
      $or: [{ email }, { googleId }],
    });

    if (!user) {
      const baseUsername = email.split("@")[0];
      const username = await generateUniqueUsername(baseUsername);

      user = await User.create({
        username,
        email,
        password: generateRandomPassword(),
        fullName,
        avatarUrl,
        role: "customer",
        provider: "google",
        googleId,
      });
    } else {
      let needSave = false;

      if (!user.googleId) {
        user.googleId = googleId;
        needSave = true;
      }

      if (user.provider !== "google") {
        user.provider = "google";
        needSave = true;
      }

      if (!user.fullName && fullName) {
        user.fullName = fullName;
        needSave = true;
      }

      if (!user.avatarUrl && avatarUrl) {
        user.avatarUrl = avatarUrl;
        needSave = true;
      }

      if (needSave) {
        await user.save();
      }
    }

    if (user.isLocked) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    return res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      token: generateToken(user._id),
      message: "Đăng nhập Google thành công",
    });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(500).json({
      message: "Đăng nhập Google thất bại",
      error: error.message,
    });
  }
});

// =========================
// ĐĂNG NHẬP APPLE
// POST /apple
// =========================
router.post("/apple", async (req, res) => {
  try {
    const { id_token, user: appleUser } = req.body;

    if (!id_token) {
      return res.status(400).json({ message: "Thiếu id_token Apple" });
    }

    const { payload } = await jwtVerify(id_token, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: process.env.APPLE_CLIENT_ID,
    });

    const appleId = payload.sub;
    const email = payload.email || appleUser?.email || "";
    const fullName = appleUser?.name
      ? `${appleUser.name.firstName || ""} ${appleUser.name.lastName || ""}`.trim()
      : "";

    if (!email) {
      return res.status(400).json({
        message: "Không lấy được email từ Apple",
      });
    }

    let user = await User.findOne({
      $or: [{ email }, { appleId }],
    });

    if (!user) {
      const baseUsername = email.split("@")[0];
      const username = await generateUniqueUsername(baseUsername);

      user = await User.create({
        username,
        email,
        password: generateRandomPassword(),
        fullName,
        role: "customer",
        provider: "apple",
        appleId,
      });
    } else {
      let needSave = false;

      if (!user.appleId) {
        user.appleId = appleId;
        needSave = true;
      }

      if (user.provider !== "apple") {
        user.provider = "apple";
        needSave = true;
      }

      if (!user.fullName && fullName) {
        user.fullName = fullName;
        needSave = true;
      }

      if (needSave) {
        await user.save();
      }
    }

    if (user.isLocked) {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    return res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      token: generateToken(user._id),
      message: "Đăng nhập Apple thành công",
    });
  } catch (error) {
    console.error("Apple login error:", error);
    return res.status(500).json({
      message: "Đăng nhập Apple thất bại",
      error: error.message,
    });
  }
});

// =========================
// ĐỔI MẬT KHẨU
// POST /change-password
// dùng token hiện tại, không lấy userId từ body nữa
// =========================
router.post("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Thiếu currentPassword/newPassword" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới tối thiểu 6 ký tự" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    const ok = await user.matchPassword(currentPassword);
    if (!ok) {
      return res.status(401).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: "Đổi mật khẩu thành công" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

// Hàm tạo JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret123", {
    expiresIn: "30d",
  });
};

module.exports = router;
