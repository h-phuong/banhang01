import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "./ResetPassword.css";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const handleReset = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      return toast.error("Mật khẩu xác nhận không khớp");
    }

    const res = await fetch("http://localhost:5000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword }),
    });

    const data = await res.json();

    if (res.ok) {
      toast.success("Đổi mật khẩu thành công 🎉");
      navigate("/login");
    } else {
      toast.error(data.message);
    }
  };

  return (
    <div className="reset-wrapper">
      <div className="reset-card">
        {/* RIGHT SIDE */}
        <div className="reset-right">
          <h2>ĐẶT LẠI MẬT KHẨU</h2>
          <p>Nhập mật khẩu mới của bạn.</p>
          <form onSubmit={handleReset}>
            <label>Nhập mật khẩu</label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <label>Xác nhận mật khẩu</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button type="submit">ĐỔI MẬT KHẨU</button>
          </form>
          <p style={{ marginTop: "25px", fontSize: "13px" }}>
            Quay lại? <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
