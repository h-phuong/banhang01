import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useCart } from "../../context/CartContext";
import "./CheckoutPayment.css";

const API_BASE = "http://localhost:5000";
const BUY_NOW_STORAGE_KEY = "checkout_buy_now";

const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

const nowStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
    0,
  ).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(
    2,
    "0",
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const statusLabel = {
  success: "Thành công",
  fail: "Thất bại",
  pending: "Chờ xử lý",
};

const methodLabel = {
  momo: "Ví MoMo",
  vnpay: "VNPay",
  cod: "Ship COD",
};

const getToken = () =>
  localStorage.getItem("token") || localStorage.getItem("adminToken") || "";

const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const isLoggedInUser = () => {
  const u = getCurrentUser();
  return !!(u?._id || u?.id || getToken());
};

const getStoredCheckoutData = () => {
  try {
    return JSON.parse(localStorage.getItem(BUY_NOW_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

function Spinner() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <style>{`@keyframes lspin{to{transform:rotate(360deg)}} .lspin{transform-origin:24px 24px;animation:lspin 1.1s linear infinite}`}</style>
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke="rgba(169, 20, 30, 0.12)"
        strokeWidth="1.5"
      />
      <path
        className="lspin"
        d="M24 4A20 20 0 0 1 44 24"
        fill="none"
        stroke="#A9141E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function CheckoutPayment() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { removePurchasedItems } = useCart();

  const storedCheckout = getStoredCheckoutData();

  const rawItems = (() => {
    if (Array.isArray(state?.items) && state.items.length > 0) {
      return state.items;
    }

    if (state?.item) return [state.item];
    if (state?.product) return [state.product];
    if (state?.buyNowItem) return [state.buyNowItem];

    if (
      state &&
      !Array.isArray(state) &&
      (state._id || state.productId || state.name)
    ) {
      return [state];
    }

    if (Array.isArray(storedCheckout?.items)) {
      return storedCheckout.items;
    }

    return [];
  })();

  const cartItems = rawItems;
  const initMethod =
    state?.paymentMethod || storedCheckout?.paymentMethod || "cod";
  const cartVouchers = state?.vouchers || storedCheckout?.vouchers || [];
  const subtotal =
    state?.subtotal ??
    storedCheckout?.subtotal ??
    cartItems.reduce(
      (sum, i) => sum + Number(i?.price || 0) * Number(i?.quantity || 1),
      0,
    );
  const shippingFee =
    state?.shippingFee ?? storedCheckout?.shippingFee ?? 30000;
  const cartDiscount = state?.discount ?? storedCheckout?.discount ?? 0;

  const [stage, setStage] = useState("form");
  const [method, setMethod] = useState(initMethod);
  const [procMsg, setProcMsg] = useState("");
  const [lastTxn, setLastTxn] = useState(null);
  const [txnError, setTxnError] = useState("");
  const [loading, setLoading] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(cartVouchers[0] || null);

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);

  const couponDiscount = appliedCoupon?.discountAmount || cartDiscount || 0;
  const finalTotal = Math.max(subtotal + shippingFee - couponDiscount, 0);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "Hồ Chí Minh",
    district: "Quận 1",
    note: "",
  });

  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem(
        BUY_NOW_STORAGE_KEY,
        JSON.stringify({
          items: cartItems,
          paymentMethod: method,
          vouchers: appliedCoupon
            ? [
                {
                  code: appliedCoupon.code,
                  type: appliedCoupon.type,
                  discountAmount: appliedCoupon.discountAmount,
                },
              ]
            : cartVouchers,
          subtotal,
          shippingFee,
          discount: couponDiscount,
        }),
      );
    }
  }, [
    cartItems,
    method,
    appliedCoupon,
    cartVouchers,
    subtotal,
    shippingFee,
    couponDiscount,
  ]);

  useEffect(() => {
    try {
      const u = getCurrentUser();
      setForm((f) => ({
        ...f,
        name: u.fullName || u.username || "",
        email: u.email || "",
        phone: u.phone || "",
      }));
    } catch {}
  }, []);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const u = getCurrentUser();
        const userId = u._id || u.id;
        if (!userId) return;

        setAddressLoading(true);
        const res = await axios.get(`${API_BASE}/api/addresses/my/${userId}`);
        const list = Array.isArray(res.data) ? res.data : [];

        setSavedAddresses(list);

        const defaultAddress =
          list.find((a) => a.isDefault) || (list.length > 0 ? list[0] : null);

        if (defaultAddress) {
          setSelectedAddressId(defaultAddress._id);
          setForm((f) => ({
            ...f,
            name: defaultAddress.receiver || f.name,
            phone: defaultAddress.phone || f.phone,
            address: defaultAddress.detail || f.address,
          }));
        }
      } catch (err) {
        console.error("Lỗi tải địa chỉ:", err);
      } finally {
        setAddressLoading(false);
      }
    };

    loadAddresses();
  }, []);

  const handleSelectSavedAddress = (id) => {
    setSelectedAddressId(id);

    const picked = savedAddresses.find((a) => a._id === id);
    if (!picked) return;

    setForm((f) => ({
      ...f,
      name: picked.receiver || "",
      phone: picked.phone || "",
      address: picked.detail || "",
    }));
  };

  const handleGoAfterSuccess = () => {
    localStorage.removeItem(BUY_NOW_STORAGE_KEY);

    if (isLoggedInUser()) {
      navigate("/profile?tab=orders");
    } else {
      navigate("/notifications");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const momoCode = params.get("resultCode");
    const vnpCode = params.get("vnp_ResponseCode");
    const vnpRef = params.get("vnp_TxnRef");
    const momoOid = params.get("orderId");

    if (momoCode !== null || vnpCode !== null) {
      const isOk = momoCode === "0" || vnpCode === "00";
      const oid = momoOid || vnpRef || "";
      const m = momoCode !== null ? "momo" : "vnpay";

      if (isOk && cartItems.length > 0) {
        removePurchasedItems(cartItems);
        localStorage.removeItem(BUY_NOW_STORAGE_KEY);
      }

      setLastTxn({
        id: oid,
        orderId: oid,
        method: m,
        amount: finalTotal,
        status: isOk ? "success" : "fail",
        date: nowStr(),
      });
      setStage("result");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [cartItems, finalTotal, removePurchasedItems]);

  const handleApplyCoupon = useCallback(async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError("Vui lòng nhập mã giảm giá.");
      return;
    }

    setCouponLoading(true);
    setCouponError("");
    setCouponSuccess("");

    try {
      const res = await axios.get(`${API_BASE}/api/coupons?code=${code}`, {
        headers: authHeader(),
      });

      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.docs)
          ? res.data.docs
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];

      const found = list.find(
        (c) => String(c.code || "").toUpperCase() === code,
      );

      if (!found) {
        setCouponError("Mã giảm giá không tồn tại hoặc đã hết hạn.");
        return;
      }

      let discountAmount = 0;
      const minOrder = Number(found.minOrderValue || 0);

      if (minOrder > 0 && subtotal < minOrder) {
        setCouponError(`Đơn tối thiểu ${fmtVND(minOrder)} để dùng mã này.`);
        return;
      }

      if (found.type === "percent") {
        discountAmount = Math.round(
          subtotal * (Number(found.discountValue || 0) / 100),
        );
      } else {
        discountAmount = Number(found.discountValue || 0);
      }

      discountAmount = Math.min(discountAmount, subtotal);

      if (discountAmount <= 0) {
        setCouponError("Mã giảm giá không áp dụng được cho đơn này.");
        return;
      }

      setAppliedCoupon({
        code: found.code,
        type: found.type,
        discountAmount,
      });
      setCouponSuccess(`Áp dụng thành công! Giảm ${fmtVND(discountAmount)}`);
      setCouponCode("");
    } catch (err) {
      setCouponError(
        err?.response?.data?.message || "Không thể kiểm tra mã giảm giá.",
      );
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, subtotal]);

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess("");
    setCouponError("");
  };

  const buildOrderPayload = useCallback(
    (paymentMethod) => {
      const userId = (() => {
        try {
          const u = getCurrentUser();
          return u._id || u.id || null;
        } catch {
          return null;
        }
      })();

      return {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city,
        district: form.district,
        ward: "",
        note: form.note.trim(),
        userId,
        items: cartItems.map((i) => ({
          itemId: i.itemId || i._id || "",
          productId: i.productId || i._id || "",
          variantId: i.variantId || null,
          name: i.name,
          image: i.image || "",
          color: i.color || "-",
          size: i.size || "-",
          quantity: i.quantity || 1,
          price: i.price || 0,
        })),
        subtotal,
        shippingFee,
        productDiscount: couponDiscount,
        shippingDiscount: 0,
        totalPrice: finalTotal,
        paymentMethod,
        vouchers: appliedCoupon
          ? [
              {
                code: appliedCoupon.code,
                type: appliedCoupon.type,
                discountAmount: appliedCoupon.discountAmount,
              },
            ]
          : [],
      };
    },
    [
      form,
      cartItems,
      subtotal,
      shippingFee,
      couponDiscount,
      finalTotal,
      appliedCoupon,
    ],
  );

  const createOrder = useCallback(
    async (paymentMethod) => {
      const payload = buildOrderPayload(paymentMethod);
      const res = await axios.post(`${API_BASE}/api/orders`, payload, {
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
      });

      const order = res.data?.order || res.data;
      const orderId = order?._id || order?.id;

      if (!orderId) {
        throw new Error("Tạo đơn hàng thất bại, không nhận được mã đơn.");
      }

      const amount = order?.finalAmount || finalTotal;
      return { orderId, amount };
    },
    [buildOrderPayload, finalTotal],
  );

  const placeCODOrder = useCallback(async () => {
    return await createOrder("cod");
  }, [createOrder]);

  const initMoMo = useCallback(async () => {
    const { orderId, amount } = await createOrder("momo");
    const res = await axios.post(
      `${API_BASE}/api/momo/create`,
      { orderId, amount },
      {
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
      },
    );
    return { ...res.data, orderId };
  }, [createOrder]);

  const initVNPay = useCallback(async () => {
    const { orderId, amount } = await createOrder("vnpay");
    const res = await axios.post(
      `${API_BASE}/api/payment/vnpay`,
      { orderId, amount },
      {
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
      },
    );
    return { ...res.data, orderId };
  }, [createOrder]);

  const handlePay = useCallback(async () => {
    if (!form.name.trim()) {
      setTxnError("Vui lòng nhập họ tên.");
      return;
    }
    if (!form.phone.trim()) {
      setTxnError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!form.address.trim()) {
      setTxnError("Vui lòng nhập địa chỉ.");
      return;
    }
    if (cartItems.length === 0) {
      setTxnError("Giỏ hàng trống.");
      return;
    }

    setTxnError("");
    setLoading(true);
    setStage("processing");

    const msgs = {
      cod: ["Xác nhận đơn hàng...", "Tạo vận đơn...", "Phân công shipper..."],
      momo: ["Tạo đơn hàng...", "Kết nối ví MoMo...", "Đang chuyển hướng..."],
      vnpay: ["Tạo đơn hàng...", "Kết nối VNPay...", "Đang chuyển hướng..."],
    };

    let i = 0;
    setProcMsg(msgs[method][0]);

    const iv = setInterval(() => {
      i++;
      if (i < msgs[method].length) setProcMsg(msgs[method][i]);
    }, 900);

    try {
      if (method === "cod") {
        const { orderId, amount } = await placeCODOrder();
        await removePurchasedItems(cartItems);
        clearInterval(iv);
        localStorage.removeItem(BUY_NOW_STORAGE_KEY);

        setLastTxn({
          id: orderId,
          orderId,
          method: "cod",
          amount: amount || finalTotal,
          status: "pending",
          date: nowStr(),
        });

        setLoading(false);
        setStage("result");
      } else if (method === "momo") {
        const data = await initMoMo();
        clearInterval(iv);

        if (data?.payUrl) {
          window.location.href = data.payUrl;
        } else {
          throw new Error(
            data?.localMessage ||
              data?.message ||
              "Không nhận được link thanh toán MoMo",
          );
        }
      } else if (method === "vnpay") {
        const data = await initVNPay();
        clearInterval(iv);

        const url =
          data?.paymentUrl || data?.vnpUrl || data?.url || data?.redirectUrl;

        if (url) {
          window.location.href = url;
        } else {
          throw new Error(
            data?.message || "Không nhận được link thanh toán VNPay",
          );
        }
      }
    } catch (err) {
      clearInterval(iv);
      setLoading(false);
      setStage("form");

      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Đặt hàng thất bại, vui lòng thử lại.";

      setTxnError(msg);
    }
  }, [
    form,
    method,
    cartItems,
    finalTotal,
    placeCODOrder,
    initMoMo,
    initVNPay,
    removePurchasedItems,
  ]);

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <header className="checkout-header">
          <h1 className="checkout-brand">
            LOCAL<span className="checkout-brand-accent">BRAND</span>
          </h1>
          <p className="checkout-tagline">Vietnamese Fashion House</p>
          <div className="checkout-gold-line" />
        </header>

        {stage === "form" && (
          <div className="checkout-grid">
            <div>
              {txnError && (
                <div className="checkout-error-box">⚠ {txnError}</div>
              )}

              <div className="checkout-card">
                <div className="checkout-section-label">
                  Thông tin giao hàng
                </div>

                <div className="checkout-form-row single">
                  <div className="checkout-form-group">
                    <label className="checkout-label">
                      Chọn địa chỉ đã lưu
                    </label>
                    <select
                      className="checkout-select"
                      value={selectedAddressId}
                      onChange={(e) => handleSelectSavedAddress(e.target.value)}
                      disabled={addressLoading}
                    >
                      <option value="">
                        {addressLoading
                          ? "Đang tải địa chỉ..."
                          : "-- Chọn địa chỉ đã lưu --"}
                      </option>
                      {savedAddresses.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name} - {a.receiver} - {a.phone}
                          {a.isDefault ? " (Mặc định)" : ""}
                        </option>
                      ))}
                    </select>

                    {!addressLoading && savedAddresses.length === 0 && (
                      <div className="checkout-address-hint">
                        Bạn chưa có địa chỉ đã lưu. Vui lòng nhập thủ công.
                      </div>
                    )}
                  </div>
                </div>

                <div className="checkout-form-row">
                  <div className="checkout-form-group">
                    <label className="checkout-label">Họ tên *</label>
                    <input
                      className="checkout-input"
                      value={form.name}
                      placeholder="Nguyễn Thị Lan"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>

                  <div className="checkout-form-group">
                    <label className="checkout-label">Số điện thoại *</label>
                    <input
                      className="checkout-input"
                      value={form.phone}
                      placeholder="0901 234 567"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, phone: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="checkout-form-row single">
                  <div className="checkout-form-group">
                    <label className="checkout-label">Email</label>
                    <input
                      className="checkout-input"
                      value={form.email}
                      placeholder="email@gmail.com"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="checkout-form-row single">
                  <div className="checkout-form-group">
                    <label className="checkout-label">Địa chỉ *</label>
                    <input
                      className="checkout-input"
                      value={form.address}
                      placeholder="Số nhà, tên đường, phường/xã"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, address: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="checkout-form-row">
                  <div className="checkout-form-group">
                    <label className="checkout-label">Thành phố</label>
                    <select
                      className="checkout-select"
                      value={form.city}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, city: e.target.value }))
                      }
                    >
                      {[
                        "Hồ Chí Minh",
                        "Hà Nội",
                        "Đà Nẵng",
                        "Cần Thơ",
                        "Bình Dương",
                        "Đồng Nai",
                        "Hải Phòng",
                        "Nha Trang",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="checkout-form-group">
                    <label className="checkout-label">Quận / Huyện</label>
                    <select
                      className="checkout-select"
                      value={form.district}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, district: e.target.value }))
                      }
                    >
                      {[
                        "Quận 1",
                        "Quận 2",
                        "Quận 3",
                        "Quận 4",
                        "Quận 5",
                        "Quận 6",
                        "Quận 7",
                        "Quận 8",
                        "Quận 9",
                        "Quận 10",
                        "Quận 11",
                        "Quận 12",
                        "Bình Thạnh",
                        "Gò Vấp",
                        "Tân Bình",
                        "Phú Nhuận",
                        "Thủ Đức",
                        "Bình Tân",
                      ].map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="checkout-form-row single">
                  <div className="checkout-form-group">
                    <label className="checkout-label">Ghi chú</label>
                    <input
                      className="checkout-input"
                      value={form.note}
                      placeholder="Giao giờ hành chính, gọi trước khi giao..."
                      onChange={(e) =>
                        setForm((f) => ({ ...f, note: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="checkout-card">
                <div className="checkout-section-label">
                  Phương thức thanh toán
                </div>

                {[
                  {
                    id: "momo",
                    name: "Ví MoMo",
                    desc: "Chuyển đến trang MoMo để thanh toán",
                  },
                  {
                    id: "vnpay",
                    name: "VNPay QR / ATM",
                    desc: "ATM nội địa, Visa/Master, QR Banking",
                  },
                  {
                    id: "cod",
                    name: "Ship COD",
                    desc: "Thanh toán tiền mặt khi nhận hàng",
                  },
                ].map((m) => (
                  <div
                    key={m.id}
                    className={`checkout-pay-option ${method === m.id ? "active" : ""}`}
                    onClick={() => setMethod(m.id)}
                  >
                    <div className="checkout-radio-outer">
                      <div className="checkout-radio-dot" />
                    </div>

                    <div className={`checkout-pay-logo ${m.id}`}>
                      {m.id === "momo"
                        ? "MoMo"
                        : m.id === "vnpay"
                          ? "VNPay"
                          : "COD"}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div className="checkout-pay-name">{m.name}</div>
                      <div className="checkout-pay-desc">{m.desc}</div>
                    </div>

                    <span className="checkout-badge">
                      {m.id === "cod" ? "Miễn phí" : "Online"}
                    </span>
                  </div>
                ))}

                <div className="checkout-warning-box">
                  <span>ℹ</span>

                  {method === "momo" && (
                    <span>
                      Bạn sẽ được chuyển đến trang <strong>MoMo</strong>. Sau
                      khi thanh toán sẽ tự quay về.
                    </span>
                  )}

                  {method === "vnpay" && (
                    <span>
                      Bạn sẽ được chuyển đến trang <strong>VNPay</strong>. Hỗ
                      trợ ATM, Visa, QR Pay tất cả ngân hàng.
                    </span>
                  )}

                  {method === "cod" && (
                    <span>
                      Thanh toán tiền mặt khi nhận hàng. Giao trong 2–4 ngày làm
                      việc.
                    </span>
                  )}
                </div>

                <button
                  className="checkout-btn-primary"
                  onClick={handlePay}
                  disabled={loading}
                >
                  {loading
                    ? "Đang xử lý..."
                    : `Đặt Hàng — ${fmtVND(finalTotal)}`}
                </button>
              </div>
            </div>

            <div>
              <div className="checkout-card sticky">
                <div className="checkout-section-label">
                  {cartItems.length > 0
                    ? `${cartItems.length} sản phẩm`
                    : "Đơn hàng"}
                </div>

                {cartItems.length === 0 ? (
                  <div className="checkout-empty-state">
                    <div
                      style={{
                        fontSize: 28,
                        marginBottom: 10,
                        opacity: 0.3,
                      }}
                    >
                      ◈
                    </div>
                    <div style={{ fontSize: 12, letterSpacing: 2 }}>
                      Giỏ hàng trống
                    </div>
                    <button
                      className="checkout-btn-outline"
                      onClick={() => navigate("/")}
                    >
                      Tiếp tục mua sắm
                    </button>
                  </div>
                ) : (
                  <>
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="checkout-item">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="checkout-item-img"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="checkout-item-placeholder">👗</div>
                        )}

                        <div style={{ flex: 1 }}>
                          <div className="checkout-item-name">{item.name}</div>
                          <div className="checkout-item-variant">
                            {[item.color, item.size]
                              .filter((v) => v && v !== "-")
                              .join(" · ")}
                          </div>
                        </div>

                        <div>
                          <div className="checkout-item-price">
                            {fmtVND((item.price || 0) * (item.quantity || 1))}
                          </div>
                          <div className="checkout-item-qty">
                            x{item.quantity || 1}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div style={{ paddingTop: 8 }}>
                      <div style={{ marginBottom: 16 }}>
                        <div className="checkout-coupon-row">
                          <input
                            type="text"
                            placeholder="Nhập mã giảm giá"
                            value={couponCode}
                            onChange={(e) =>
                              setCouponCode(e.target.value.toUpperCase())
                            }
                            className="checkout-coupon-input"
                            disabled={couponLoading || !!appliedCoupon}
                          />

                          <button
                            onClick={handleApplyCoupon}
                            disabled={
                              couponLoading ||
                              !couponCode.trim() ||
                              !!appliedCoupon
                            }
                            className="checkout-coupon-btn"
                          >
                            {couponLoading ? "..." : "Áp dụng"}
                          </button>
                        </div>

                        {couponError && (
                          <div className="checkout-coupon-msg error">
                            {couponError}
                          </div>
                        )}

                        {couponSuccess && (
                          <div className="checkout-coupon-msg success">
                            {couponSuccess}
                          </div>
                        )}

                        {appliedCoupon && (
                          <div className="checkout-coupon-applied">
                            <span>
                              Mã: <strong>{appliedCoupon.code}</strong>
                            </span>
                            <button
                              onClick={handleRemoveCoupon}
                              className="checkout-coupon-remove"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="checkout-summary-row">
                        <span>Tạm tính</span>
                        <span>{fmtVND(subtotal)}</span>
                      </div>

                      <div className="checkout-summary-row">
                        <span>Phí vận chuyển</span>
                        <span>{fmtVND(shippingFee)}</span>
                      </div>

                      {couponDiscount > 0 && (
                        <div className="checkout-summary-row discount">
                          <span>
                            Giảm giá
                            {appliedCoupon && (
                              <span className="checkout-summary-code">
                                [{appliedCoupon.code}]
                              </span>
                            )}
                          </span>
                          <span>−{fmtVND(couponDiscount)}</span>
                        </div>
                      )}

                      <div className="checkout-summary-total">
                        <span>Tổng cộng</span>
                        <span className="value">{fmtVND(finalTotal)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {stage === "processing" && (
          <div className="checkout-processing">
            <Spinner />
            <div className="checkout-proc-title">{procMsg}</div>
            <div className="checkout-proc-sub">
              Vui lòng không đóng trang này
            </div>
          </div>
        )}

        {stage === "result" && lastTxn && (
          <div className="checkout-result">
            <div className={`checkout-result-icon ${lastTxn.status}`}>
              {lastTxn.status === "success"
                ? "✓"
                : lastTxn.status === "fail"
                  ? "✕"
                  : "◷"}
            </div>

            <h2 className="checkout-result-title">
              {lastTxn.status === "success"
                ? "Đặt Hàng Thành Công"
                : lastTxn.status === "fail"
                  ? "Thanh Toán Thất Bại"
                  : "Đơn Hàng Đã Xác Nhận"}
            </h2>

            <div className="checkout-result-id">
              {lastTxn.orderId || lastTxn.id}
            </div>

            <div className="checkout-result-detail">
              {[
                ["Mã đơn hàng", lastTxn.orderId || lastTxn.id],
                ["Phương thức", methodLabel[lastTxn.method] || lastTxn.method],
                ...(lastTxn.amount > 0
                  ? [["Số tiền", fmtVND(lastTxn.amount)]]
                  : []),
                ["Thời gian", lastTxn.date],
                ["Trạng thái", statusLabel[lastTxn.status]],
              ].map(([k, v]) => (
                <div key={k} className="checkout-result-row">
                  <span>{k}</span>
                  <span className="checkout-result-val">{v}</span>
                </div>
              ))}
            </div>

            {lastTxn.status !== "fail" ? (
              <>
                <button
                  className="checkout-btn-primary"
                  style={{ maxWidth: 340 }}
                  onClick={handleGoAfterSuccess}
                >
                  {isLoggedInUser() ? "Xem Đơn Hàng Của Tôi" : "Xem Thông Báo"}
                </button>

                <button
                  className="checkout-btn-outline"
                  style={{ maxWidth: 340 }}
                  onClick={() => navigate("/")}
                >
                  Tiếp Tục Mua Sắm
                </button>
              </>
            ) : (
              <>
                <button
                  className="checkout-btn-primary"
                  style={{ maxWidth: 340 }}
                  onClick={() => setStage("form")}
                >
                  Thử Lại
                </button>
                <button
                  className="checkout-btn-outline"
                  style={{ maxWidth: 340 }}
                  onClick={() => navigate("/cart")}
                >
                  Quay Về Giỏ Hàng
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
