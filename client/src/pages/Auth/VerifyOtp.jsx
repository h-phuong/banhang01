import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "./VerifyOtp.css";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email;

  const handleVerify = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();

    if (res.ok) {
      toast.success("OTP hợp lệ ✅");
      navigate("/reset-password", { state: { email } });
    } else {
      toast.error(data.message);
    }
  };

  return (
    <div className="verify-wrapper">
      <div className="verify-card">
        <div className="verify-right">
          <h2>XÁC NHẬN OTP</h2>
          <p>Nhập mã OTP đã gửi đến email.</p>

          <form onSubmit={handleVerify}>
            <div className="otp-inputs">
              {[...Array(6)].map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  className="otp-box"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/^[0-9]?$/.test(value)) return;

                    const newOtp = otp.split("");
                    newOtp[index] = value;
                    const updatedOtp = newOtp.join("");
                    setOtp(updatedOtp);

                    // Auto focus sang ô tiếp theo
                    if (value && e.target.nextSibling) {
                      e.target.nextSibling.focus();
                    }
                  }}
                />
              ))}
            </div>

            <button type="submit">XÁC NHẬN</button>
          </form>

          <p style={{ marginTop: "25px", fontSize: "13px" }}>
            Quay lại? <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
