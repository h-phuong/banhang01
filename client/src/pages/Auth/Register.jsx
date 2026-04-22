import "./Register.css";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export default function Register() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);

  const googleButtonRef = useRef(null);
  const googleInitializedRef = useRef(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID;
  const APPLE_REDIRECT_URI = import.meta.env.VITE_APPLE_REDIRECT_URI;

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuthSuccess = async (data, successMessage) => {
    const userData = data?.user ? data.user : data;
    const token = data?.token;
    const userId = data?._id || data?.user?._id || userData?._id;

    if (!token) {
      toast.error("Không nhận được token đăng nhập");
      return;
    }

    if (userData?.role === "admin") {
      toast.error("Tài khoản quản trị viên phải đăng nhập qua trang quản trị!");
      return;
    }

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    window.dispatchEvent(new Event("user-changed"));

    if (userId) {
      try {
        await axios.post(
          `${API_URL}/api/notifications`,
          {
            user: userId,
            title: "Đăng nhập/đăng ký thành công",
            content: "Chào mừng bạn đến với LocalBrand.",
            link: "/profile",
            type: "account",
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
      } catch (err) {
        console.error("Notification error:", err);
      }
    }

    toast.success(successMessage || "Thành công!");
    navigate("/", { replace: true });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (!formData.username || !formData.email || !formData.password) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      const userId =
        res.data?._id ||
        res.data?.user?._id ||
        res.data?.newUser?._id ||
        res.data?.data?._id;

      if (userId) {
        try {
          await axios.post(`${API_URL}/api/notifications`, {
            user: userId,
            title: "Đăng ký tài khoản thành công",
            content:
              "Chào mừng bạn đến với LocalBrand. Tài khoản của bạn đã được tạo thành công.",
            link: "/login",
            type: "account",
          });
        } catch (notiError) {
          console.error("LỖI TẠO THÔNG BÁO ĐĂNG KÝ:", notiError);
        }
      }

      toast.success(res.data.message || "Đăng ký thành công!");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Đăng ký thất bại! Thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) {
      toast.error("Không nhận được dữ liệu từ Google");
      return;
    }

    setLoadingGoogle(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();

      if (res.ok) {
        await handleAuthSuccess(data, "Đăng ký/đăng nhập Google thành công!");
      } else {
        toast.error(data?.message || "Đăng ký Google thất bại");
      }
    } catch (error) {
      console.error("Google auth error:", error);
      toast.error("Lỗi đăng ký Google!");
    } finally {
      setLoadingGoogle(false);
    }
  };

  useEffect(() => {
    let googleTimer;
    let appleTimer;

    const initGoogle = () => {
      try {
        if (!GOOGLE_CLIENT_ID) {
          setGoogleReady(false);
          return false;
        }

        if (!window.google?.accounts?.id) {
          setGoogleReady(false);
          return false;
        }

        if (!googleButtonRef.current) {
          setGoogleReady(false);
          return false;
        }

        if (!googleInitializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
          });

          googleButtonRef.current.innerHTML = "";

          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signup_with",
            shape: "rectangular",
            width: 260,
          });

          googleInitializedRef.current = true;
        }

        setGoogleReady(true);
        return true;
      } catch (error) {
        console.error("Google SDK init error:", error);
        setGoogleReady(false);
        return false;
      }
    };

    const initApple = () => {
      try {
        if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI) {
          setAppleReady(false);
          return false;
        }

        if (!window.AppleID?.auth) {
          setAppleReady(false);
          return false;
        }

        const appleState =
          window.crypto?.randomUUID?.() ||
          `${Date.now()}_${Math.random().toString(36).slice(2)}`;

        window.AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: "name email",
          redirectURI: APPLE_REDIRECT_URI,
          state: appleState,
          usePopup: true,
        });

        setAppleReady(true);
        return true;
      } catch (error) {
        console.error("Apple SDK init error:", error);
        setAppleReady(false);
        return false;
      }
    };

    const googleReadyNow = initGoogle();
    const appleReadyNow = initApple();

    if (!googleReadyNow) {
      googleTimer = window.setInterval(() => {
        if (initGoogle()) window.clearInterval(googleTimer);
      }, 500);
    }

    if (!appleReadyNow) {
      appleTimer = window.setInterval(() => {
        if (initApple()) window.clearInterval(appleTimer);
      }, 500);
    }

    return () => {
      if (googleTimer) window.clearInterval(googleTimer);
      if (appleTimer) window.clearInterval(appleTimer);
    };
  }, [GOOGLE_CLIENT_ID, APPLE_CLIENT_ID, APPLE_REDIRECT_URI]);

  const handleGoogleRegister = () => {
    try {
      if (!GOOGLE_CLIENT_ID) {
        toast.error("Thiếu VITE_GOOGLE_CLIENT_ID trong file .env");
        return;
      }

      if (!googleReady || !window.google?.accounts?.id) {
        toast.error("Google chưa sẵn sàng");
        return;
      }

      const realGoogleButton =
        googleButtonRef.current?.querySelector("div[role='button']");

      if (realGoogleButton) {
        realGoogleButton.click();
        return;
      }

      window.google?.accounts?.id?.prompt();
    } catch (error) {
      console.error("Google register click error:", error);
      toast.error("Không thể mở đăng ký Google");
    }
  };

  const handleAppleRegister = async () => {
    try {
      if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI) {
        toast.error("Thiếu cấu hình Apple trong file .env");
        return;
      }

      if (!appleReady || !window.AppleID?.auth) {
        toast.error("Apple chưa sẵn sàng");
        return;
      }

      setLoadingApple(true);

      const response = await window.AppleID.auth.signIn();
      const idToken = response?.authorization?.id_token;

      if (!idToken) {
        toast.error("Không nhận được Apple ID token");
        return;
      }

      const res = await fetch(`${API_URL}/api/auth/apple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          user: response?.user || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await handleAuthSuccess(data, "Đăng ký/đăng nhập Apple thành công!");
      } else {
        toast.error(data?.message || "Đăng ký Apple thất bại");
      }
    } catch (error) {
      console.error("Apple register error:", error);
      toast.error(error?.message || error?.error || "Lỗi đăng ký Apple!");
    } finally {
      setLoadingApple(false);
    }
  };

  return (
    <div className="register-wrapper">
      <div className="register-card">
        <div className="register-right">
          <h2>ĐĂNG KÝ</h2>
          <p>Nhập thông tin để tạo tài khoản mới.</p>

          <form onSubmit={handleRegister}>
            <label>
              Tên đăng nhập <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              name="username"
              placeholder="Ví dụ: user123"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
            />

            <label>Họ và tên</label>
            <input
              type="text"
              name="fullName"
              placeholder="Nguyễn Văn A"
              value={formData.fullName}
              onChange={handleChange}
              autoComplete="name"
            />

            <label>
              Email <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />

            <label>
              Mật khẩu <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
            />

            <label>
              Xác nhận mật khẩu <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={loading || loadingGoogle || loadingApple}
            >
              {loading ? "ĐANG XỬ LÝ..." : "ĐĂNG KÝ"}
            </button>

            <div className="divider">
              <span>HOẶC</span>
            </div>

            <div className="social-login">
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={
                  loading || loadingGoogle || loadingApple || !GOOGLE_CLIENT_ID
                }
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                />
                {loadingGoogle ? "Đang xử lý..." : "Đăng ký với Google"}
              </button>

              <button
                type="button"
                onClick={handleAppleRegister}
                disabled={
                  loading ||
                  loadingGoogle ||
                  loadingApple ||
                  !APPLE_CLIENT_ID ||
                  !APPLE_REDIRECT_URI
                }
              >
                <img
                  src="https://www.svgrepo.com/show/475633/apple-color.svg"
                  alt="Apple"
                />
                {loadingApple ? "Đang xử lý..." : "Đăng ký với Apple"}
              </button>
            </div>

            <div
              ref={googleButtonRef}
              style={{
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
                height: 0,
                overflow: "hidden",
              }}
              aria-hidden="true"
            />
          </form>

          <p className="login">
            Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
          </p>
        </div>

        <div className="register-left">
          <img
            src="https://i.pinimg.com/1200x/e4/aa/3b/e4aa3bfcb8643af9c5ecd6031db48c78.jpg"
            alt="Fashion"
            onError={(e) => {
              if (!e.currentTarget.src.includes("/auth-hero.svg")) {
                e.currentTarget.src = "/auth-hero.svg";
              }
            }}
          />
          <div className="register-overlay">
            <h3>LOCALBRAND</h3>
            <p>Tham gia ngay để bắt đầu mua sắm.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
