import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      if (res.ok) {
        const userData = data.user ? data.user : data;
        const allowedRoles = ["admin", "manager", "staff"];

        if (!userData || !data.token) {
          toast.error("Dữ liệu đăng nhập không hợp lệ!");
          setLoading(false);
          return;
        }

        if (!allowedRoles.includes(userData.role)) {
          toast.error("Tài khoản này không có quyền truy cập trang quản trị!");
          setLoading(false);
          return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(userData));

        refreshAuth();

        toast.success("Đăng nhập thành công!");
        navigate("/admin", { replace: true });
      } else {
        toast.error(data.message || "Đăng nhập thất bại");
      }
    } catch (error) {
      console.error("Lỗi:", error);
      toast.error("Lỗi kết nối Server! (Bạn đã chạy server chưa?)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        <div className="admin-login-right">
          <div className="admin-login-header">
            <h2>TRANG QUẢN TRỊ</h2>
            <p>Đăng nhập vào hệ thống quản lý</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="forgot-password">
              <Link to="/forgot-password">Quên mật khẩu?</Link>
            </div>

            <button
              type="submit"
              className="admin-login-btn"
              disabled={loading}
            >
              {loading ? "Đang xác thực..." : "ĐĂNG NHẬP"}
            </button>
          </form>

          <div className="admin-login-footer">
            <p>
              Không phải tài khoản quản trị?{" "}
              <Link to="/login">Đăng nhập khách hàng</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
