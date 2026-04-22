import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function MoMoResult() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const resultCode = params.get("resultCode");
  const orderId    = params.get("orderId");
  const amount     = params.get("amount");
  const message    = params.get("message");

  const isSuccess = resultCode === "0";

  // Tự động chuyển trang sau 5 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(isSuccess ? "/" : "/cart");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSuccess, navigate]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Icon */}
        <div style={{ ...styles.iconCircle, background: isSuccess ? "#e8f9f0" : "#fef0f0" }}>
          {isSuccess ? (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#27ae60" opacity="0.15"/>
              <path d="M14 24l8 8 12-14" stroke="#27ae60" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#e74c3c" opacity="0.15"/>
              <path d="M16 16l16 16M32 16L16 32" stroke="#e74c3c" strokeWidth="3.5" strokeLinecap="round"/>
            </svg>
          )}
        </div>

        {/* Tiêu đề */}
        <h1 style={{ ...styles.title, color: isSuccess ? "#27ae60" : "#e74c3c" }}>
          {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại"}
        </h1>

        {/* Chi tiết */}
        {isSuccess ? (
          <div style={styles.infoBox}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Mã đơn hàng</span>
              <span style={styles.infoVal}>{orderId}</span>
            </div>
            <div style={styles.divider} />
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Số tiền</span>
              <span style={{ ...styles.infoVal, color: "#d61a72", fontWeight: 700 }}>
                {Number(amount).toLocaleString("vi-VN")}đ
              </span>
            </div>
            <div style={styles.divider} />
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Phương thức</span>
              <span style={styles.infoVal}>Ví MoMo</span>
            </div>
            <div style={styles.divider} />
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Trạng thái</span>
              <span style={{ ...styles.infoVal, color: "#27ae60" }}>Đã thanh toán ✓</span>
            </div>
          </div>
        ) : (
          <p style={styles.errorMsg}>
            {message || "Giao dịch không thành công. Vui lòng thử lại."}
          </p>
        )}

        {/* Đếm ngược */}
        <p style={styles.countdown}>
          Tự động chuyển về {isSuccess ? "trang chủ" : "giỏ hàng"} sau{" "}
          <strong style={{ color: "#d61a72" }}>{countdown}s</strong>
        </p>

        {/* Nút */}
        <div style={styles.btnRow}>
          <button
            style={styles.btnPrimary}
            onClick={() => navigate("/")}
          >
            🏠 Về trang chủ
          </button>
          {isSuccess && (
            <button
              style={styles.btnSecondary}
              onClick={() => navigate("/profile")}
            >
              📦 Xem đơn hàng
            </button>
          )}
          {!isSuccess && (
            <button
              style={styles.btnSecondary}
              onClick={() => navigate("/cart")}
            >
              🛒 Quay lại giỏ hàng
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #fff0f7 0%, #f8f8f8 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    background: "white",
    borderRadius: 20,
    padding: "2.5rem 2rem",
    maxWidth: 460,
    width: "100%",
    boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.2rem",
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0,
    textAlign: "center",
  },
  infoBox: {
    width: "100%",
    background: "#fafafa",
    border: "1px solid #f0f0f0",
    borderRadius: 12,
    padding: "0.5rem 1.2rem",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
  },
  infoLabel: { fontSize: 14, color: "#999" },
  infoVal: { fontSize: 14, color: "#222", fontWeight: 600 },
  divider: { height: 1, background: "#f0f0f0" },
  errorMsg: {
    color: "#e74c3c",
    fontSize: 14,
    textAlign: "center",
    background: "#fff0f0",
    borderRadius: 10,
    padding: "12px 16px",
    width: "100%",
  },
  countdown: {
    fontSize: 13,
    color: "#999",
    margin: 0,
    textAlign: "center",
  },
  btnRow: {
    display: "flex",
    gap: 10,
    width: "100%",
  },
  btnPrimary: {
    flex: 1,
    padding: "12px 0",
    background: "#d61a72",
    color: "white",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    flex: 1,
    padding: "12px 0",
    background: "white",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
