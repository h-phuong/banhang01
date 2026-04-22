// src/pages/PaymentVNPay.jsx
// Route: /payment/vnpay-result
// VNPAY redirect về với query params: success, orderId, amount, bankCode, transactionNo, responseCode

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

// Map mã lỗi VNPAY → tiếng Việt
const RESPONSE_CODE_MAP = {
  "00": "Giao dịch thành công",
  "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)",
  "09": "Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking",
  10: "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần",
  11: "Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch",
  12: "Thẻ/Tài khoản bị khóa",
  13: "Nhập sai mật khẩu OTP. Xin quý khách vui lòng thực hiện lại giao dịch",
  24: "Khách hàng hủy giao dịch",
  51: "Tài khoản không đủ số dư để thực hiện giao dịch",
  65: "Tài khoản đã vượt quá hạn mức giao dịch trong ngày",
  75: "Ngân hàng thanh toán đang bảo trì",
  79: "Nhập sai mật khẩu thanh toán quá số lần quy định",
  99: "Lỗi không xác định",
};

function PaymentVNPay() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  const success = searchParams.get("success") === "1";
  const orderId = searchParams.get("orderId") || "";
  const amount = searchParams.get("amount") || "0";
  const bankCode = searchParams.get("bankCode") || "";
  const transactionNo = searchParams.get("transactionNo") || "";
  const responseCode = searchParams.get("responseCode") || "";

  const responseMessage =
    RESPONSE_CODE_MAP[responseCode] ||
    (success ? "Giao dịch thành công" : "Giao dịch thất bại");

  // Auto redirect sau 10 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (success) {
            navigate("/order-success", {
              state: { orderId },
              replace: true,
            });
          } else {
            navigate("/profile", { replace: true });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [success, orderId, navigate]);

  return (
    <div
      style={{
        maxWidth: "520px",
        margin: "48px auto",
        padding: "32px 28px",
        border: "1px solid #eee",
        borderRadius: "16px",
        textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        background: "#fff",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: "36px",
          background: success ? "#ecfdf5" : "#fef2f2",
        }}
      >
        {success ? "✅" : "❌"}
      </div>

      {/* Tiêu đề */}
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: "22px",
          color: success ? "#16a34a" : "#dc2626",
        }}
      >
        {success ? "Thanh toán thành công!" : "Thanh toán thất bại"}
      </h2>

      <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 28px" }}>
        {responseMessage}
      </p>

      {/* Thông tin giao dịch */}
      <div
        style={{
          background: "#fafafa",
          border: "1px solid #eee",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "left",
          marginBottom: "24px",
          lineHeight: 2,
          fontSize: "14px",
        }}
      >
        <InfoRow label="Mã đơn hàng" value={orderId} mono />
        <InfoRow
          label="Số tiền"
          value={formatMoney(amount)}
          highlight={success}
        />
        {bankCode && <InfoRow label="Ngân hàng" value={bankCode} />}
        {transactionNo && (
          <InfoRow label="Mã giao dịch" value={transactionNo} mono />
        )}
        <InfoRow
          label="Trạng thái"
          value={success ? "✓ Thành công" : "✗ Thất bại"}
          highlight={success}
          error={!success}
        />
      </div>

      {/* Nút hành động */}
      {success ? (
        <div style={{ display: "grid", gap: "10px" }}>
          <button
            onClick={() =>
              navigate("/order-success", {
                state: { orderId },
                replace: true,
              })
            }
            style={btnStyle("#ee4d2d")}
          >
            Xem đơn hàng
          </button>
          <button
            onClick={() => navigate("/", { replace: true })}
            style={btnStyle("#fff", true)}
          >
            Tiếp tục mua sắm
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          <button
            onClick={() => navigate("/cart", { replace: true })}
            style={btnStyle("#ee4d2d")}
          >
            Quay lại giỏ hàng &amp; thử lại
          </button>
          <button
            onClick={() => navigate("/profile", { replace: true })}
            style={btnStyle("#fff", true)}
          >
            Xem đơn hàng của tôi
          </button>
        </div>
      )}

      {/* Đếm ngược */}
      <p
        style={{
          marginTop: "20px",
          fontSize: "13px",
          color: "#9ca3af",
        }}
      >
        Tự động chuyển trang sau{" "}
        <strong style={{ color: "#ee4d2d" }}>{countdown}s</strong>
      </p>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function InfoRow({ label, value, mono, highlight, error }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #f3f4f6",
        paddingBottom: "4px",
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          fontFamily: mono ? "monospace" : "inherit",
          fontSize: mono ? "13px" : "14px",
          color: highlight ? "#16a34a" : error ? "#dc2626" : "#111827",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function btnStyle(bg, outline = false) {
  return {
    width: "100%",
    padding: "13px",
    background: outline ? "#fff" : bg,
    color: outline ? "#374151" : "#fff",
    border: outline ? "1px solid #d1d5db" : "none",
    borderRadius: "10px",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
  };
}

export default PaymentVNPay;
