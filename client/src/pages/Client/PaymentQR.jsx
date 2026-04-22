import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:5000/api";
const EXPIRE_SECONDS = 300; // 5 phút

function formatMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function PaymentQR() {
  const location = useLocation();
  const navigate = useNavigate();

  const order = location.state?.order || null;
  const orderId = location.state?.orderId || order?._id || "";
  const total = Number(
    location.state?.total || order?.finalAmount || order?.totalPrice || 0,
  );

  const [timeLeft, setTimeLeft] = useState(EXPIRE_SECONDS);
  const [submitting, setSubmitting] = useState(false);

  const bank = "MB";
  const account = "123456789";
  const transferContent = `ORDER${orderId}`;

  const qrUrl = useMemo(() => {
    if (!orderId || !total) return "";
    return `https://img.vietqr.io/image/${bank}-${account}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(
      transferContent,
    )}`;
  }, [orderId, total]);

  useEffect(() => {
    if (!orderId || !total) {
      alert("Không tìm thấy thông tin thanh toán");
      navigate("/cart", { replace: true });
    }
  }, [orderId, total, navigate]);

  useEffect(() => {
    if (!orderId || !total) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert("Mã QR đã hết hạn");
          navigate("/cart", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderId, total, navigate]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handlePaid = async () => {
    if (!orderId || submitting) return;

    try {
      setSubmitting(true);

      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "Confirmed",
          note: "Khách đã xác nhận thanh toán chuyển khoản QR",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Không cập nhật được trạng thái đơn");
      }

      navigate("/order-success", {
        replace: true,
        state: {
          orderId,
          order: data?.order || order || null,
        },
      });
    } catch (error) {
      console.error("PaymentQR confirm paid error:", error);
      alert(error.message || "Lỗi xác nhận thanh toán");
    } finally {
      setSubmitting(false);
    }
  };

  if (!orderId || !total) return null;

  return (
    <div
      style={{
        maxWidth: "520px",
        margin: "40px auto",
        padding: "28px",
        border: "1px solid #eee",
        borderRadius: "16px",
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        background: "#fff",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "10px" }}>
        Quét QR để thanh toán
      </h2>

      <p style={{ color: "#666", marginBottom: "20px" }}>
        Vui lòng chuyển khoản đúng số tiền và nội dung để hệ thống dễ đối soát.
      </p>

      <div
        style={{
          display: "inline-flex",
          padding: "14px",
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: "14px",
        }}
      >
        <img
          src={qrUrl}
          alt="QR Payment"
          width="280"
          height="280"
          style={{ objectFit: "contain" }}
        />
      </div>

      <div
        style={{
          marginTop: "18px",
          textAlign: "left",
          background: "#fafafa",
          border: "1px solid #eee",
          borderRadius: "12px",
          padding: "14px 16px",
          lineHeight: 1.7,
        }}
      >
        <div>
          <strong>Mã đơn:</strong> {orderId}
        </div>
        <div>
          <strong>Ngân hàng:</strong> {bank}
        </div>
        <div>
          <strong>Số tài khoản:</strong> {account}
        </div>
        <div>
          <strong>Số tiền:</strong>{" "}
          <span style={{ color: "#ee4d2d", fontWeight: 700 }}>
            {formatMoney(total)}
          </span>
        </div>
        <div>
          <strong>Nội dung CK:</strong> {transferContent}
        </div>
      </div>

      <p
        style={{
          marginTop: "16px",
          color: "#dc2626",
          fontWeight: 700,
        }}
      >
        Thời gian còn lại: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
      </p>

      <button
        onClick={handlePaid}
        disabled={submitting}
        style={{
          width: "100%",
          marginTop: "14px",
          padding: "12px 18px",
          background: submitting ? "#9ca3af" : "#ee4d2d",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          cursor: submitting ? "not-allowed" : "pointer",
          fontWeight: 700,
        }}
      >
        {submitting ? "Đang xác nhận..." : "Tôi đã thanh toán"}
      </button>

      <button
        onClick={() => navigate("/profile", { replace: true })}
        disabled={submitting}
        style={{
          width: "100%",
          marginTop: "10px",
          padding: "11px 18px",
          border: "1px solid #d1d5db",
          borderRadius: "10px",
          background: "#fff",
          cursor: submitting ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
        Xem đơn hàng của tôi
      </button>
    </div>
  );
}

export default PaymentQR;
