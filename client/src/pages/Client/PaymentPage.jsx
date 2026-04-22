import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

// ──────────────────────────────────────────────
// Trang chọn phương thức + xử lý MoMo
// ──────────────────────────────────────────────
export default function PaymentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [momoData, setMomoData] = useState(null); // { payUrl, qrCodeUrl, orderId, amount }
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 1 giờ tính bằng giây

  // Đếm ngược
  useEffect(() => {
    if (!momoData) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [momoData]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return {
      h: String(h).padStart(2, '0'),
      m: String(m).padStart(2, '0'),
      s: String(s).padStart(2, '0'),
    };
  };

  const handlePayment = async (typePayment) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(
        '/api/payment/create',
        { typePayment },
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
      );

      if (typePayment === 'momo') {
        setMomoData(res.data.metadata);
      } else {
        navigate('/payment/success');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  // ── Hiển thị trang QR MoMo sau khi tạo link ──
  if (momoData) {
    const t = formatTime(timeLeft);
    return (
      <div style={styles.pageWrap}>
        <div style={styles.momoCard}>
          {/* Header */}
          <div style={styles.momoHeader}>
            <MomoLogo size={36} />
            <span style={styles.headerTitle}>Cổng thanh toán MoMo</span>
          </div>

          <div style={styles.momoBody}>
            {/* Panel thông tin đơn hàng */}
            <div style={styles.infoPanel}>
              <h2 style={styles.panelTitle}>Thông tin đơn hàng</h2>

              <Field label="Nhà cung cấp">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MomoLogo size={20} />
                  <span style={styles.fieldVal}>MoMo Payment</span>
                </div>
              </Field>

              <Field label="Mã đơn hàng">
                <span style={styles.fieldVal}>{momoData.orderId}</span>
              </Field>

              <Field label="Số tiền">
                <span style={styles.amount}>
                  {Number(momoData.amount).toLocaleString('vi-VN')}đ
                </span>
              </Field>

              {/* Đồng hồ đếm ngược */}
              <div style={styles.expireBox}>
                <p style={styles.expireLabel}>Đơn hàng sẽ hết hạn sau:</p>
                <div style={styles.timerRow}>
                  {[{ val: t.h, unit: 'Giờ' }, { val: t.m, unit: 'Phút' }, { val: t.s, unit: 'Giây' }].map(({ val, unit }) => (
                    <div key={unit} style={styles.timerBlock}>
                      <span style={styles.timerNum}>{val}</span>
                      <span style={styles.timerUnit}>{unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nút mở App MoMo */}
              <a href={momoData.payUrl} style={styles.openAppBtn} target="_blank" rel="noreferrer">
                Mở App MoMo để thanh toán
              </a>

              <p style={styles.backLink} onClick={() => setMomoData(null)}>
                ← Quay về
              </p>
            </div>

            {/* Panel QR */}
            <div style={styles.qrPanel}>
              <p style={styles.qrTitle}>Quét mã QR để thanh toán</p>

              <div style={styles.qrFrame}>
                {momoData.qrCodeUrl ? (
                  <img
                    src={momoData.qrCodeUrl}
                    alt="MoMo QR Code"
                    style={{ width: 200, height: 200, display: 'block' }}
                  />
                ) : (
                  <QrPlaceholder />
                )}
              </div>

              <p style={styles.qrHint}>
                Sử dụng <strong>App MoMo</strong> hoặc ứng dụng{'\n'}camera hỗ trợ QR code để quét mã
              </p>
              <p style={styles.helpLink}>Gặp khó khăn khi thanh toán? Xem Hướng dẫn</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Trang chọn phương thức thanh toán ──
  return (
    <div style={styles.pageWrap}>
      <div style={styles.selectCard}>
        <h2 style={{ marginBottom: 24, color: '#222', fontSize: 20 }}>Chọn phương thức thanh toán</h2>

        {error && <p style={styles.errorMsg}>{error}</p>}

        <button
          style={{ ...styles.payBtn, background: '#ae2070', color: 'white' }}
          onClick={() => handlePayment('momo')}
          disabled={loading}
        >
          <MomoLogo size={24} white />
          {loading ? 'Đang xử lý...' : 'Thanh toán qua MoMo'}
        </button>

        <button
          style={styles.payBtn}
          onClick={() => handlePayment('cod')}
          disabled={loading}
        >
          💵  Thanh toán khi nhận hàng (COD)
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Trang kết quả (redirect từ MoMo về)
// ──────────────────────────────────────────────
export function PaymentResult() {
  const [params] = useSearchParams();
  const success = window.location.pathname.includes('success');
  const orderId = params.get('orderId');
  const amount  = params.get('amount');
  const message = params.get('message');

  return (
    <div style={styles.pageWrap}>
      <div style={{ ...styles.selectCard, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>{success ? '✅' : '❌'}</div>
        <h2 style={{ marginTop: 12, color: success ? '#27ae60' : '#e74c3c' }}>
          {success ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
        </h2>
        {success ? (
          <>
            <p style={{ color: '#666', marginTop: 8 }}>Mã đơn hàng: <strong>{orderId}</strong></p>
            <p style={{ color: '#666' }}>Số tiền: <strong>{Number(amount).toLocaleString('vi-VN')}đ</strong></p>
          </>
        ) : (
          <p style={{ color: '#666', marginTop: 8 }}>{message || 'Có lỗi xảy ra khi thanh toán'}</p>
        )}
        <a href="/" style={{ ...styles.openAppBtn, display: 'inline-block', marginTop: 20, textDecoration: 'none' }}>
          Về trang chủ
        </a>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{label}</p>
      {children}
    </div>
  );
}

function MomoLogo({ size = 32, white = false }) {
  return (
    <div style={{
      width: size, height: size,
      background: white ? 'rgba(255,255,255,0.2)' : '#d61a72',
      borderRadius: size * 0.22,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ color: 'white', fontSize: size * 0.27, fontWeight: 800, lineHeight: 1.1, textAlign: 'center' }}>
        mo{'\n'}mo
      </span>
    </div>
  );
}

function QrPlaceholder() {
  return (
    <div style={{ width: 200, height: 200, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
      <span style={{ color: '#999', fontSize: 13 }}>Đang tải QR...</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = {
  pageWrap: {
    minHeight: '100vh',
    background: '#f4f4f4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: 'system-ui, sans-serif',
  },
  momoCard: {
    background: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 4px 32px rgba(0,0,0,0.12)',
    width: '100%',
    maxWidth: 780,
  },
  momoHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 24px',
    borderBottom: '1px solid #f0f0f0',
  },
  headerTitle: { fontSize: 15, fontWeight: 600, color: '#333' },
  momoBody: { display: 'flex' },
  infoPanel: {
    flex: 1, padding: '24px',
    display: 'flex', flexDirection: 'column',
  },
  panelTitle: { fontSize: 18, fontWeight: 600, color: '#222', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #f0f0f0' },
  fieldVal: { fontSize: 14, color: '#222', fontWeight: 500 },
  amount: { fontSize: 28, fontWeight: 700, color: '#222' },
  expireBox: {
    background: '#fff5f9', border: '1px solid #ffd6e8',
    borderRadius: 10, padding: '12px 16px', marginBottom: 16,
  },
  expireLabel: { fontSize: 12, color: '#e0457a', marginBottom: 8 },
  timerRow: { display: 'flex', gap: 8 },
  timerBlock: {
    background: '#e0457a', color: 'white',
    borderRadius: 6, padding: '6px 14px', textAlign: 'center',
  },
  timerNum: { fontSize: 20, fontWeight: 700, display: 'block' },
  timerUnit: { fontSize: 10 },
  openAppBtn: {
    display: 'block', background: '#d61a72', color: 'white',
    border: 'none', borderRadius: 10, padding: '12px 0',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    textAlign: 'center', marginBottom: 12,
  },
  backLink: {
    color: '#d61a72', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', textAlign: 'center',
  },
  qrPanel: {
    background: 'linear-gradient(145deg, #d61a72, #a8005a)',
    padding: 32,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 16,
    minWidth: 300,
  },
  qrTitle: { color: 'white', fontSize: 17, fontWeight: 600, textAlign: 'center' },
  qrFrame: {
    background: 'white', borderRadius: 12, padding: 12,
  },
  qrHint: { color: 'rgba(255,255,255,0.9)', fontSize: 13, textAlign: 'center', lineHeight: 1.6, whiteSpace: 'pre-line' },
  helpLink: { color: '#ffd700', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' },
  selectCard: {
    background: 'white', borderRadius: 16,
    padding: '2rem', width: '100%', maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  payBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: '14px 20px', borderRadius: 10, border: '1px solid #ddd',
    fontSize: 15, fontWeight: 600, cursor: 'pointer', background: 'white',
  },
  errorMsg: { background: '#fff0f0', color: '#c0392b', padding: '10px 14px', borderRadius: 8, fontSize: 14 },
};
