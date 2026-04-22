import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// vnpayController.vnpayReturn redirect params:
// success, orderId, amount, bankCode, transactionNo, responseCode

const T = {
  bg: "#fffafa",
  surface: "#ffffff",
  surfaceHigh: "#fff7f8",
  border: "rgba(169, 20, 30, 0.12)",
  gold: "#a9141e",
  goldMuted: "#de5b87",
  text: "#2d2024",
  textMuted: "#6b585e",
  success: "#2e8b57",
  successBg: "#2e8b57",
  fail: "#a9141e",
  failBg: "#a9141e",
};

const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

const nowStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(
    2,
    "0",
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Cập nhật localStorage history
const updateTxnHistory = (orderId, status) => {
  try {
    const key = "localbrand_txns";
    const txns = JSON.parse(localStorage.getItem(key) || "[]");
    const next = txns.map((t) =>
      t.orderId === orderId || t.id === orderId ? { ...t, status } : t,
    );
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
};

function Spinner() {
  return (
    <i
      className="fas fa-spinner"
      style={{
        fontSize: 42,
        color: T.gold,
        animation: "spin 1s linear infinite",
      }}
    />
  );
}

export default function VNPayResult() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  // Đọc params từ vnpayController.vnpayReturn:
  // ?success=1&orderId=xxx&amount=510000&bankCode=NCB&transactionNo=15475956&responseCode=00
  const success = params.get("success");
  const orderId = params.get("orderId") || "";
  const rawAmount = params.get("amount") || "0";
  const bankCode = params.get("bankCode") || "";
  const transactionNo = params.get("transactionNo") || "";
  const responseCode = params.get("responseCode") || "";

  const isSuccess = success === "1" || responseCode === "00";

  // amount từ vnpay đôi khi nhân 100 — kiểm tra và chia lại
  const amount = (() => {
    const n = Number(rawAmount);
    // Nếu amount > 50 triệu thì khả năng cao là x100
    return n > 50_000_000 ? n / 100 : n;
  })();

  useEffect(() => {
    if (orderId) updateTxnHistory(orderId, isSuccess ? "success" : "fail");
    const timer = setTimeout(() => setReady(true), 700);
    return () => clearTimeout(timer);
  }, [orderId, isSuccess]);

  const S = {
    root: {
      fontFamily: "'Roboto','Helvetica Neue',sans-serif",
      background: T.bg,
      color: T.text,
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    },
    box: {
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: "48px 40px",
      maxWidth: 460,
      width: "100%",
      textAlign: "center",
      boxShadow: "0 8px 24px rgba(169, 20, 30, 0.06)",
    },
    brand: {
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: 4,
      color: T.text,
      marginBottom: 14,
      textTransform: "uppercase",
    },
    brandAccent: { color: T.gold },
    goldLine: {
      width: 44,
      height: 2,
      background: T.gold,
      margin: "0 auto 28px",
    },
    icon: (ok) => ({
      width: 72,
      height: 72,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 24px",
      background: ok ? T.successBg : T.failBg,
      border: "none",
      color: "#ffffff",
      fontSize: 28,
    }),
    title: {
      fontSize: 34,
      fontWeight: 800,
      color: T.gold,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 18,
      color: T.textMuted,
      marginBottom: 30,
      lineHeight: 1.7,
    },
    detail: {
      background: T.surfaceHigh,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: "22px 24px",
      marginBottom: 30,
      textAlign: "left",
    },
    row: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 15,
      padding: "12px 0",
      color: T.textMuted,
      borderBottom: `1px solid ${T.border}`,
      gap: 12,
    },
    rowLast: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 15,
      padding: "12px 0",
      color: T.textMuted,
      gap: 12,
    },
    val: {
      color: T.text,
      fontWeight: 600,
      fontSize: 15,
    },
    valMono: {
      color: T.text,
      fontWeight: 600,
      fontFamily: "monospace",
      fontSize: 14,
    },
    valGold: {
      color: T.gold,
      fontWeight: 700,
      fontSize: 18,
    },
    btnPrimary: {
      width: "100%",
      padding: "16px",
      background: T.gold,
      color: "#ffffff",
      border: "none",
      borderRadius: 12,
      fontSize: 16,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "'Roboto',sans-serif",
      fontWeight: 700,
      marginBottom: 14,
    },
    btnOutline: {
      width: "100%",
      padding: "14px",
      background: "transparent",
      color: T.gold,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      fontSize: 15,
      letterSpacing: 1,
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "'Roboto',sans-serif",
      fontWeight: 700,
    },
    loadingText: {
      fontSize: 16,
      color: T.textMuted,
    },
  };

  return (
    <div style={S.root}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={S.box}>
        <div style={S.brand}>
          LOCAL<span style={S.brandAccent}>BRAND</span>
        </div>
        <div style={S.goldLine} />

        {!ready && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <Spinner />
            <div style={S.loadingText}>Đang xác nhận thanh toán...</div>
          </div>
        )}

        {ready && isSuccess && (
          <>
            <div style={S.icon(true)}>
              <i className="fas fa-check"></i>
            </div>
            <h2 style={S.title}>Thanh Toán Thành Công</h2>
            <p style={S.subtitle}>Cảm ơn bạn đã mua sắm tại LocalBrand</p>

            <div style={S.detail}>
              {orderId && (
                <div style={S.row}>
                  <span>Mã đơn hàng</span>
                  <span style={S.valMono}>{orderId}</span>
                </div>
              )}
              {amount > 0 && (
                <div style={S.row}>
                  <span>Số tiền</span>
                  <span style={S.valGold}>{fmtVND(amount)}</span>
                </div>
              )}
              {bankCode && (
                <div style={S.row}>
                  <span>Ngân hàng</span>
                  <span style={S.val}>{bankCode}</span>
                </div>
              )}
              {transactionNo && (
                <div style={S.row}>
                  <span>Mã giao dịch VNPay</span>
                  <span style={S.valMono}>{transactionNo}</span>
                </div>
              )}
              <div style={S.rowLast}>
                <span>Thời gian</span>
                <span style={S.val}>{nowStr()}</span>
              </div>
            </div>

            <button style={S.btnPrimary} onClick={() => navigate("/")}>
              Tiếp Tục Mua Sắm
            </button>
            <button style={S.btnOutline} onClick={() => navigate("/checkout")}>
              Xem Lịch Sử Đơn Hàng
            </button>
          </>
        )}

        {ready && !isSuccess && (
          <>
            <div style={S.icon(false)}>
              <i className="fas fa-times"></i>
            </div>
            <h2 style={S.title}>Thanh Toán Thất Bại</h2>
            <p style={S.subtitle}>
              {responseCode === "24"
                ? "Giao dịch bị hủy bởi người dùng."
                : responseCode === "51"
                  ? "Tài khoản không đủ số dư."
                  : responseCode === "65"
                    ? "Tài khoản vượt hạn mức giao dịch."
                    : "Giao dịch không thành công, vui lòng thử lại."}
            </p>

            {(orderId || responseCode) && (
              <div style={S.detail}>
                {orderId && (
                  <div style={S.row}>
                    <span>Mã đơn hàng</span>
                    <span style={S.valMono}>{orderId}</span>
                  </div>
                )}
                {responseCode && (
                  <div style={S.rowLast}>
                    <span>Mã lỗi VNPay</span>
                    <span style={S.val}>{responseCode}</span>
                  </div>
                )}
              </div>
            )}

            <button style={S.btnPrimary} onClick={() => navigate("/cart")}>
              Quay Về Giỏ Hàng & Thử Lại
            </button>
            <button
              style={{ ...S.btnOutline, marginTop: 10 }}
              onClick={() => navigate("/")}
            >
              Về Trang Chủ
            </button>
          </>
        )}
      </div>
    </div>
  );
}
