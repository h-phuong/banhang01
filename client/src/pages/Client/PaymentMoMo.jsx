import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:5000/api";
const EXPIRE_SECONDS = 300; // 5 phút

function formatMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function PaymentMoMo() {
  const location = useLocation();
  const navigate = useNavigate();

  const order = location.state?.order || null;
  const orderId = location.state?.orderId || order?._id || "";
  const total = Number(
    location.state?.total || order?.finalAmount || order?.totalPrice || 0,
  );

  const [timeLeft, setTimeLeft] = useState(EXPIRE_SECONDS);
  const [submitting, setSubmitting] = useState(false);

  const transferContent = `ORDER${orderId}`;

  // ── Sinh QR bằng api.qrserver.com với logo MoMo nhúng vào ──────────────────
  // Nội dung QR là deeplink MoMo chuẩn
  const momoDeeplink = useMemo(() => {
    if (!orderId || !total) return "";
    // Deeplink MoMo: mở app MoMo → chuyển tiền đến số 0909123456
    return `momo://transfer?phone=0909123456&amount=${total}&comment=${encodeURIComponent(transferContent)}&appScheme=momo`;
  }, [orderId, total]);

  // QR chứa deeplink MoMo — dùng api.qrserver.com sinh ảnh QR
  const qrUrl = useMemo(() => {
    if (!momoDeeplink) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(momoDeeplink)}&color=ae2070&bgcolor=ffffff&qzone=1`;
  }, [momoDeeplink]);

  // ── Kiểm tra đầu vào ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId || !total) {
      alert("Không tìm thấy thông tin thanh toán");
      navigate("/cart", { replace: true });
    }
  }, [orderId, total, navigate]);

  // ── Đếm ngược hết hạn ───────────────────────────────────────────────────────
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

  // ── Xác nhận đã thanh toán ──────────────────────────────────────────────────
  const handlePaid = async () => {
    if (!orderId || submitting) return;

    try {
      setSubmitting(true);

      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Confirmed",
          note: "Khách đã xác nhận thanh toán MoMo",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Không cập nhật được trạng thái đơn");
      }

      navigate("/order-success", {
        replace: true,
        state: { orderId, order: data?.order || order || null },
      });
    } catch (error) {
      console.error("PaymentMoMo confirm error:", error);
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
      {/* Logo MoMo */}
      <div style={{ marginBottom: "12px" }}>
        <svg
          width="120"
          height="40"
          viewBox="0 0 120 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="120" height="40" rx="8" fill="#ae2070" />
          <text
            x="60"
            y="27"
            textAnchor="middle"
            fill="white"
            fontFamily="Arial"
            fontWeight="bold"
            fontSize="20"
            letterSpacing="2"
          >
            MoMo
          </text>
        </svg>
      </div>

      <h2 style={{ marginTop: 0, marginBottom: "10px", color: "#ae2070" }}>
        Quét QR để thanh toán
      </h2>

      <p style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}>
        Mở app <strong style={{ color: "#ae2070" }}>MoMo</strong> → Quét mã bên
        dưới để hoàn tất thanh toán.
      </p>

      {/* QR MoMo */}
      <div
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px",
          background: "#fff",
          border: "2px solid #ae2070",
          borderRadius: "16px",
          position: "relative",
        }}
      >
        {/* Logo MoMo nhỏ ở giữa QR */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={qrUrl}
            alt="MoMo QR Payment"
            width="260"
            height="260"
            style={{ objectFit: "contain", display: "block" }}
          />
          {/* Badge MoMo giữa QR */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "#ae2070",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 900,
              fontSize: "14px",
              border: "3px solid #fff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              letterSpacing: "-0.5px",
            }}
          >
            MM
          </div>
        </div>

        {/* Label dưới QR */}
        <div
          style={{
            marginTop: "10px",
            fontSize: "12px",
            color: "#ae2070",
            fontWeight: 700,
            letterSpacing: "1px",
          }}
        >
          MOMO QR
        </div>
      </div>

      {/* Thông tin đơn */}
      <div
        style={{
          marginTop: "18px",
          textAlign: "left",
          background: "#fdf0f7",
          border: "1px solid #f0c0da",
          borderRadius: "12px",
          padding: "14px 16px",
          lineHeight: 1.8,
          fontSize: "14px",
        }}
      >
        <div>
          <strong>Mã đơn:</strong> {orderId}
        </div>
        <div>
          <strong>Số MoMo:</strong> 0909123456
        </div>
        <div>
          <strong>Số tiền:</strong>{" "}
          <span style={{ color: "#ae2070", fontWeight: 700 }}>
            {formatMoney(total)}
          </span>
        </div>
        <div>
          <strong>Nội dung CK:</strong> {transferContent}
        </div>
      </div>

      {/* Đếm ngược */}
      <p style={{ marginTop: "16px", color: "#dc2626", fontWeight: 700 }}>
        Thời gian còn lại: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
      </p>

      {/* Nút xác nhận */}
      <button
        onClick={handlePaid}
        disabled={submitting}
        style={{
          width: "100%",
          marginTop: "14px",
          padding: "12px 18px",
          background: submitting ? "#9ca3af" : "#ae2070",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          cursor: submitting ? "not-allowed" : "pointer",
          fontWeight: 700,
          fontSize: "15px",
        }}
      >
        {submitting ? "Đang xác nhận..." : "Tôi đã thanh toán"}
      </button>

      {/* Nút xem đơn */}
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
          color: "#444",
          fontSize: "14px",
        }}
      >
        Xem đơn hàng của tôi
      </button>
    </div>
  );
}

export default PaymentMoMo;
