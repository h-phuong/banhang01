import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);

  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const googleButtonRef = useRef(null);
  const googleInitializedRef = useRef(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID;
  const APPLE_REDIRECT_URI = import.meta.env.VITE_APPLE_REDIRECT_URI;

  const handleLoginSuccess = async (data, successMessage) => {
    const userData = data?.user ? data.user : data;
    const token = data?.token;

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
    refreshAuth();

    const userId = data?._id || data?.user?._id || userData?._id;

    if (userId) {
      fetch(`${API_URL}/api/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user: userId,
          title: "Đăng nhập thành công",
          content: "Chào mừng bạn quay lại LocalBrand.",
          link: "/profile",
          type: "account",
        }),
      }).catch((err) => console.error("Notification error:", err));
    }

    toast.success(successMessage || "Đăng nhập thành công!");
    navigate("/", { replace: true });
  };

  const handleGoogleCredentialResponse = async (response) => {
    console.log("Google credential response:", response);

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
      console.log("Google backend response:", data);

      if (res.ok) {
        await handleLoginSuccess(data, "Đăng nhập Google thành công!");
      } else {
        toast.error(data?.message || "Đăng nhập Google thất bại");
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast.error("Lỗi đăng nhập Google!");
    } finally {
      setLoadingGoogle(false);
    }
  };

  useEffect(() => {
    console.log("VITE_API_URL =", API_URL);
    console.log("VITE_GOOGLE_CLIENT_ID =", GOOGLE_CLIENT_ID);
    console.log("VITE_APPLE_CLIENT_ID =", APPLE_CLIENT_ID);
    console.log("VITE_APPLE_REDIRECT_URI =", APPLE_REDIRECT_URI);
    console.log("window.google =", window.google);
    console.log("window.google?.accounts?.id =", window.google?.accounts?.id);
    console.log("window.AppleID =", window.AppleID);

    let googleTimer;
    let appleTimer;

    const initGoogle = () => {
      try {
        console.log("initGoogle called");

        if (!GOOGLE_CLIENT_ID) {
          console.warn("Thiếu VITE_GOOGLE_CLIENT_ID");
          setGoogleReady(false);
          return false;
        }

        if (!window.google?.accounts?.id) {
          console.warn("Google SDK chưa load xong");
          setGoogleReady(false);
          return false;
        }

        if (!googleButtonRef.current) {
          console.warn("googleButtonRef chưa sẵn sàng");
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
            text: "signin_with",
            shape: "rectangular",
            width: 260,
          });

          googleInitializedRef.current = true;
          console.log("Google initialized successfully");
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
        console.log("initApple called");

        if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI) {
          console.warn("Thiếu APPLE_CLIENT_ID hoặc APPLE_REDIRECT_URI");
          setAppleReady(false);
          return false;
        }

        if (!window.AppleID?.auth) {
          console.warn("Apple SDK chưa load xong");
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

        console.log("Apple initialized successfully");
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
        if (initGoogle()) {
          window.clearInterval(googleTimer);
        }
      }, 500);
    }

    if (!appleReadyNow) {
      appleTimer = window.setInterval(() => {
        if (initApple()) {
          window.clearInterval(appleTimer);
        }
      }, 500);
    }

    return () => {
      if (googleTimer) window.clearInterval(googleTimer);
      if (appleTimer) window.clearInterval(appleTimer);
    };
  }, [API_URL, GOOGLE_CLIENT_ID, APPLE_CLIENT_ID, APPLE_REDIRECT_URI]);

  const handleGoogleLogin = async () => {
    try {
      console.log("clicked google");
      console.log("googleReady =", googleReady);
      console.log("GOOGLE_CLIENT_ID =", GOOGLE_CLIENT_ID);
      console.log("window.google =", window.google);
      console.log("window.google?.accounts?.id =", window.google?.accounts?.id);

      if (!GOOGLE_CLIENT_ID) {
        toast.error("Thiếu VITE_GOOGLE_CLIENT_ID trong file .env");
        return;
      }

      if (!googleReady || !window.google?.accounts?.id) {
        toast.error("Google login chưa sẵn sàng");
        return;
      }

      const realGoogleButton =
        googleButtonRef.current?.querySelector("div[role='button']");

      console.log("realGoogleButton =", realGoogleButton);

      if (realGoogleButton) {
        realGoogleButton.click();
        return;
      }

      window.google.accounts.id.prompt((notification) => {
        console.log("Google prompt notification:", notification);
      });
    } catch (error) {
      console.error("Google login click error:", error);
      toast.error("Không thể mở đăng nhập Google");
    }
  };

  const handleAppleLogin = async () => {
    try {
      console.log("clicked apple");
      console.log("appleReady =", appleReady);
      console.log("APPLE_CLIENT_ID =", APPLE_CLIENT_ID);
      console.log("APPLE_REDIRECT_URI =", APPLE_REDIRECT_URI);
      console.log("window.AppleID =", window.AppleID);

      if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI) {
        toast.error("Thiếu cấu hình Apple trong file .env");
        return;
      }

      if (!appleReady || !window.AppleID?.auth) {
        toast.error("Apple login chưa sẵn sàng");
        return;
      }

      setLoadingApple(true);

      const response = await window.AppleID.auth.signIn();
      console.log("Apple response:", response);

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
      console.log("Apple backend response:", data);

      if (res.ok) {
        await handleLoginSuccess(data, "Đăng nhập Apple thành công!");
      } else {
        toast.error(data?.message || "Đăng nhập Apple thất bại");
      }
    } catch (error) {
      console.error("Apple login error:", error);
      try {
        console.error(
          "Apple login error JSON:",
          JSON.stringify(error, null, 2),
        );
      } catch (_) {
        console.error("Apple error stringify failed");
      }
      toast.error(error?.message || error?.error || "Lỗi đăng nhập Apple!");
    } finally {
      setLoadingApple(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingEmail(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("Email login response:", data);

      if (res.ok) {
        await handleLoginSuccess(data, "Đăng nhập thành công!");
      } else {
        toast.error(data?.message || "Đăng nhập thất bại");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Lỗi kết nối Server! (Bạn đã chạy server chưa?)");
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-left">
          <img
            src="https://i.pinimg.com/1200x/e4/aa/3b/e4aa3bfcb8643af9c5ecd6031db48c78.jpg"
            alt="LocalBrand"
            onError={(e) => {
              if (!e.currentTarget.src.includes("/auth-hero.svg")) {
                e.currentTarget.src = "/auth-hero.svg";
              }
            }}
          />
          <div className="login-overlay">
            <h3>LOCALBRAND</h3>
            <p>Chào mừng bạn trở lại!</p>
          </div>
        </div>

        <div className="login-right">
          <h2>ĐĂNG NHẬP</h2>
          <p>Nhập thông tin để tiếp tục mua sắm.</p>

          <form onSubmit={handleLogin}>
            <label>Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Mật khẩu</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="forgot-password">
              <Link to="/forgot-password">Quên mật khẩu?</Link>
            </div>

            <button
              type="submit"
              disabled={loadingEmail || loadingGoogle || loadingApple}
            >
              {loadingEmail ? "Đang đăng nhập..." : "ĐĂNG NHẬP"}
            </button>

            <div className="divider">
              <span>HOẶC</span>
            </div>

            <div className="social-login">
              <button
                type="button"
                className="google-btn"
                onClick={handleGoogleLogin}
                disabled={
                  loadingGoogle ||
                  loadingEmail ||
                  loadingApple ||
                  !GOOGLE_CLIENT_ID
                }
                title={!GOOGLE_CLIENT_ID ? "Thiếu VITE_GOOGLE_CLIENT_ID" : ""}
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                />
                {loadingGoogle ? "Đang xử lý..." : "Đăng nhập với Google"}
              </button>

              <button
                type="button"
                className="apple-btn"
                onClick={handleAppleLogin}
                disabled={
                  loadingApple ||
                  loadingEmail ||
                  loadingGoogle ||
                  !APPLE_CLIENT_ID ||
                  !APPLE_REDIRECT_URI
                }
                title={
                  !APPLE_CLIENT_ID || !APPLE_REDIRECT_URI
                    ? "Thiếu cấu hình Apple trong file .env"
                    : ""
                }
              >
                <img
                  src="https://www.svgrepo.com/show/475633/apple-color.svg"
                  alt="Apple"
                />
                {loadingApple ? "Đang xử lý..." : "Đăng nhập với Apple"}
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

          <p className="register">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>

          <p className="admin-link">
            Bạn là quản trị viên?{" "}
            <Link to="/admin-login">Đăng nhập quản trị</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
