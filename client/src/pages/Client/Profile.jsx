import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Profile.css";

const API_BASE = "http://localhost:5000/api";

const TABS = [
  { key: "account", label: "Tài khoản" },
  { key: "orders", label: "Đơn hàng" },
  { key: "addresses", label: "Địa chỉ" },
  { key: "security", label: "Bảo mật" },
];

const emptyUser = {
  fullName: "",
  email: "",
  phoneNumber: "",
  avatarUrl: "",
  gender: "male",
  birthday: "",
};

function isValidObjectId(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value.trim());
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");

  const getStoredAuth = () => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");

    let u = null;
    try {
      u = raw ? JSON.parse(raw) : null;
    } catch {
      u = null;
    }

    const userId = u?._id || u?.id || null;
    return { token, userId, storedUser: u };
  };

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const getOrderItemProductId = (it) => {
    if (!it) return "";

    const readId = (value) => {
      if (!value) return "";
      if (typeof value === "string" && isValidObjectId(value)) {
        return value.trim();
      }
      if (typeof value === "object") {
        if (typeof value._id === "string" && isValidObjectId(value._id)) {
          return value._id.trim();
        }
        if (typeof value.id === "string" && isValidObjectId(value.id)) {
          return value.id.trim();
        }
      }
      return "";
    };

    return (
      readId(it?.productId) ||
      readId(it?.raw?.productId) ||
      readId(it?.product) ||
      readId(it?.raw?.product) ||
      ""
    );
  };

  const [loadingUser, setLoadingUser] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [error, setError] = useState("");

  const [user, setUser] = useState(emptyUser);
  const [initialUser, setInitialUser] = useState(emptyUser);

  const fallbackAvatar = useMemo(() => {
    const name = encodeURIComponent(user.fullName || user.email || "User");
    return `https://ui-avatars.com/api/?name=${name}&background=111827&color=fff&size=256`;
  }, [user.fullName, user.email]);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orders, setOrders] = useState([]);
  const [orderKeyword, setOrderKeyword] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderActionLoading, setOrderActionLoading] = useState("");
  const [orderPage, setOrderPage] = useState(1);
  const ORDERS_PER_PAGE = 5;

  const [addrLoading, setAddrLoading] = useState(false);
  const [addrError, setAddrError] = useState("");
  const [addresses, setAddresses] = useState([]);

  const emptyAddressForm = {
    id: "",
    name: "Địa chỉ",
    receiver: "",
    phone: "",
    detail: "",
    isDefault: false,
  };

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressFormMode, setAddressFormMode] = useState("create");
  const [addressForm, setAddressForm] = useState(emptyAddressForm);

  const [pw, setPw] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const formatMoney = (v) => {
    const num = Number(v || 0);
    return new Intl.NumberFormat("vi-VN").format(num) + "₫";
  };

  const toAbsoluteImageUrl = (url) => {
    const value = String(url || "").trim();
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
    if (value.startsWith("/")) {
      return `http://localhost:5000${value}`;
    }
    return `http://localhost:5000/${value}`;
  };

  const normalizeUserData = (data, fallback = {}) => ({
    fullName:
      data?.fullName ||
      data?.name ||
      fallback?.fullName ||
      fallback?.name ||
      "",
    email: data?.email || fallback?.email || "",
    phoneNumber:
      data?.phoneNumber || data?.phone || fallback?.phoneNumber || "",
    avatarUrl: data?.avatarUrl || data?.avatar || fallback?.avatarUrl || "",
    gender: data?.gender || fallback?.gender || "male",
    birthday: data?.birthday
      ? String(data.birthday).slice(0, 10)
      : fallback?.birthday || "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      const { token, userId, storedUser } = getStoredAuth();

      if (!token || !userId) {
        navigate("/login", { replace: true });
        return;
      }

      if (storedUser) {
        const localUser = normalizeUserData(storedUser, storedUser);
        setUser((prev) => ({ ...prev, ...localUser }));
        setInitialUser((prev) => ({ ...prev, ...localUser }));
      }

      try {
        setLoadingUser(true);
        setError("");

        const res = await fetch(`${API_BASE}/users/${userId}`, {
          method: "GET",
          headers: authHeaders(),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data?.message || `Không tải được tài khoản (${res.status})`);
          return;
        }

        const nextUser = normalizeUserData(data, storedUser || {});
        setUser(nextUser);
        setInitialUser(nextUser);

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...(storedUser || {}),
            ...data,
            _id: data?._id || storedUser?._id || userId,
            fullName: nextUser.fullName,
            email: nextUser.email,
            phoneNumber: nextUser.phoneNumber,
            avatarUrl: nextUser.avatarUrl,
            gender: nextUser.gender,
            birthday: nextUser.birthday,
          }),
        );
      } catch (e) {
        console.log("LOAD PROFILE ERROR:", e);
        setError("Không tải được thông tin tài khoản");
      } finally {
        setLoadingUser(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleSaveProfile = async () => {
    const { token, userId, storedUser } = getStoredAuth();

    if (!token || !userId) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setSavingUser(true);
      setError("");

      const payload = {
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        gender: user.gender,
        birthday: user.birthday,
      };

      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || `Cập nhật thất bại (${res.status})`);
        return;
      }

      const updatedSource = data?.user || data;
      const nextUser = normalizeUserData(updatedSource, user);

      setUser(nextUser);
      setInitialUser(nextUser);

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...(storedUser || {}),
          ...(updatedSource || {}),
          _id: updatedSource?._id || storedUser?._id || userId,
          username: updatedSource?.username ?? storedUser?.username,
          email: nextUser.email || storedUser?.email,
          role: updatedSource?.role ?? storedUser?.role,
          fullName: nextUser.fullName,
          phoneNumber: nextUser.phoneNumber,
          avatarUrl: nextUser.avatarUrl,
          gender: nextUser.gender,
          birthday: nextUser.birthday,
        }),
      );

      alert("Cập nhật thành công!");
    } catch (e) {
      console.log("SAVE PROFILE ERROR:", e);
      setError("Lỗi server khi cập nhật");
    } finally {
      setSavingUser(false);
    }
  };

  const handleResetProfileForm = () => {
    setUser(initialUser);
    setError("");
  };

  const checkItemReviewed = async (item, order) => {
    try {
      const productId = String(item?.productId || "").trim();
      const orderCode = String(
        order?.raw?.orderCode || order?.id || order?.orderId || "",
      ).trim();

      if (!isValidObjectId(productId) || !orderCode) return false;

      const params = new URLSearchParams({
        orderCode,
      });

      const res = await fetch(
        `${API_BASE}/reviews/check/${productId}?${params.toString()}`,
        {
          headers: authHeaders(),
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) return false;

      return !!data?.reviewed;
    } catch (err) {
      console.log("CHECK REVIEWED ERROR:", err);
      return false;
    }
  };

  const loadOrders = async () => {
    const { userId } = getStoredAuth();
    if (!userId) return;

    try {
      setOrdersLoading(true);
      setOrdersError("");

      const res = await fetch(`${API_BASE}/orders/my-orders/${userId}`, {
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setOrdersError(
          data?.message || `Không tải được đơn hàng (${res.status})`,
        );
        return;
      }

      const mapped = await Promise.all(
        (Array.isArray(data) ? data : []).map(async (o) => ({
          id: o.orderCode || o._id,
          orderId: o._id,
          date: (o.createdAt || "").slice(0, 10),
          total: o.finalAmount ?? o.totalPrice ?? o.total ?? 0,
          status: mapOrderStatus(o.status),
          rawStatus: o.status || "",
          shippingAddress:
            o.shippingAddress?.fullAddress ||
            o.shippingAddress?.detail ||
            o.address?.detail ||
            "",
          paymentMethod: o.paymentMethod || o.paymentType || "—",
          paymentStatus: o.paymentStatus || "—",
          note: o.customerNote || o.note || "",
          items: Array.isArray(o.details)
            ? await Promise.all(
                o.details.map(async (it) => {
                  const resolvedProductId = getOrderItemProductId(it);

                  const itemMapped = {
                    productId: resolvedProductId,
                    variantId: it?.variantId || it?.variant?._id || "",
                    name:
                      it?.productName ||
                      it?.product?.name ||
                      it?.name ||
                      "Sản phẩm",
                    image: toAbsoluteImageUrl(
                      it?.thumbnail ||
                        it?.image ||
                        it?.product?.images?.[0]?.imageUrl ||
                        it?.product?.images?.[0] ||
                        "",
                    ),
                    color: it?.color || it?.variant?.color?.name || "",
                    size: it?.size || it?.variant?.size?.name || "",
                    sku: it?.sku || "",
                    price: it?.unitPrice ?? it?.price ?? 0,
                    quantity: it?.quantity ?? 1,
                    subtotal:
                      (it?.unitPrice ?? it?.price ?? 0) * (it?.quantity ?? 1),
                    product:
                      it?.product && typeof it.product === "object"
                        ? it.product
                        : null,
                    raw: it,
                  };

                  const reviewed =
                    o.status === "Delivered"
                      ? await checkItemReviewed(itemMapped, {
                          id: o.orderCode || o._id,
                          orderId: o._id,
                          raw: o,
                        })
                      : false;

                  return {
                    ...itemMapped,
                    reviewed,
                  };
                }),
              )
            : [],
          raw: o,
        })),
      );

      setOrders(mapped);
    } catch (e) {
      console.log("LOAD ORDERS ERROR:", e);
      setOrdersError("Lỗi tải đơn hàng");
    } finally {
      setOrdersLoading(false);
    }
  };

  const getOrderRawStatus = (order) =>
    String(order?.rawStatus || order?.raw?.status || "").trim();

  const canReviewOrder = (order) => getOrderRawStatus(order) === "Delivered";

  const canConfirmReceived = (order) => getOrderRawStatus(order) === "Shipping";

  const canCancelOrder = (order) =>
    ["Pending", "Confirmed", "Processing"].includes(getOrderRawStatus(order));

  const updateOrderStateAfterAction = (
    orderId,
    nextRawStatus,
    nextPaymentStatus,
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === orderId
          ? {
              ...o,
              rawStatus: nextRawStatus,
              status: mapOrderStatus(nextRawStatus),
              paymentStatus: nextPaymentStatus ?? o.paymentStatus,
              raw: {
                ...o.raw,
                status: nextRawStatus,
                paymentStatus: nextPaymentStatus ?? o.raw?.paymentStatus,
              },
            }
          : o,
      ),
    );

    setSelectedOrder((prev) =>
      prev?.orderId === orderId
        ? {
            ...prev,
            rawStatus: nextRawStatus,
            status: mapOrderStatus(nextRawStatus),
            paymentStatus: nextPaymentStatus ?? prev.paymentStatus,
            raw: {
              ...prev.raw,
              status: nextRawStatus,
              paymentStatus: nextPaymentStatus ?? prev.raw?.paymentStatus,
            },
          }
        : prev,
    );
  };

  const handleConfirmReceived = async (order) => {
    if (!order?.orderId) return;
    if (!window.confirm("Xác nhận bạn đã nhận được hàng?")) return;

    try {
      setOrderActionLoading(order.orderId);

      const res = await fetch(`${API_BASE}/orders/${order.orderId}/delivered`, {
        method: "PATCH",
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.message || `Cập nhật thất bại (${res.status})`);
        return;
      }

      const updatedOrder = data?.order || null;
      updateOrderStateAfterAction(
        order.orderId,
        updatedOrder?.status || "Delivered",
        updatedOrder?.paymentStatus ||
          (order.paymentMethod === "COD" ? "Paid" : order.paymentStatus),
      );

      await loadOrders();
      alert("Đã xác nhận nhận hàng thành công!");
    } catch (e) {
      console.log("CONFIRM RECEIVED ERROR:", e);
      alert("Lỗi xác nhận nhận hàng");
    } finally {
      setOrderActionLoading("");
    }
  };

  const handleCancelOrder = async (order) => {
    if (!order?.orderId) return;
    if (!window.confirm("Bạn có chắc muốn hủy đơn hàng này?")) return;

    try {
      setOrderActionLoading(order.orderId);

      const res = await fetch(`${API_BASE}/orders/${order.orderId}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          status: "Cancelled",
          note: "Khách hàng yêu cầu hủy đơn",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.message || `Huỷ đơn thất bại (${res.status})`);
        return;
      }

      const updatedOrder = data?.order || null;
      updateOrderStateAfterAction(
        order.orderId,
        updatedOrder?.status || "Cancelled",
        updatedOrder?.paymentStatus || order.paymentStatus,
      );

      await loadOrders();
      alert("Đã gửi yêu cầu hủy đơn!");
    } catch (e) {
      console.log("CANCEL ORDER ERROR:", e);
      alert("Lỗi huỷ đơn hàng");
    } finally {
      setOrderActionLoading("");
    }
  };

  const openOrderDetailModal = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeOrderDetailModal = () => {
    setSelectedOrder(null);
    setShowOrderModal(false);
  };

  const handleReviewProduct = (item, order) => {
    const productId = String(getOrderItemProductId(item) || "").trim();
    const orderCode = String(
      order?.raw?.orderCode || order?.id || order?.orderId || "",
    ).trim();

    if (item?.reviewed) {
      alert("Sản phẩm trong đơn hàng này đã được đánh giá rồi");
      return;
    }

    if (!isValidObjectId(productId)) {
      alert("Không tìm thấy sản phẩm hợp lệ để đánh giá");
      return;
    }

    if (!orderCode) {
      alert("Không tìm thấy mã đơn hàng để đánh giá");
      return;
    }

    const rawUser = localStorage.getItem("user");
    let loggedUser = null;

    try {
      loggedUser = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      loggedUser = null;
    }

    const reviewPrefill = {
      productId,
      orderCode,
      guestName:
        loggedUser?.fullName ||
        loggedUser?.name ||
        order?.raw?.receiver ||
        order?.raw?.shippingAddress?.fullName ||
        user?.fullName ||
        "",
      phone:
        loggedUser?.phoneNumber ||
        loggedUser?.phone ||
        order?.raw?.phone ||
        order?.raw?.shippingAddress?.phoneNumber ||
        user?.phoneNumber ||
        "",
      fromOrderReview: true,
    };

    sessionStorage.setItem("reviewPrefill", JSON.stringify(reviewPrefill));

    setShowOrderModal(false);
    setSelectedOrder(null);

    navigate(
      `/product/${productId}?review=1&orderCode=${encodeURIComponent(orderCode)}`,
      {
        state: {
          reviewPrefill,
          orderCode,
          openReview: true,
        },
      },
    );
  };

  const loadAddresses = async () => {
    const { userId } = getStoredAuth();
    if (!userId) return;

    try {
      setAddrLoading(true);
      setAddrError("");

      const res = await fetch(`${API_BASE}/addresses/my/${userId}`, {
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setAddrError(data?.message || `Không tải được địa chỉ (${res.status})`);
        return;
      }

      const mapped = (Array.isArray(data) ? data : []).map((a) => ({
        id: a._id,
        name: a.name || "Địa chỉ",
        receiver: a.receiver || a.fullName || "",
        phone: a.phone || "",
        detail:
          a.detail ||
          [a.addressLine, a.ward, a.district, a.province]
            .filter(Boolean)
            .join(", "),
        isDefault: !!a.isDefault,
        raw: a,
      }));

      setAddresses(mapped);
    } catch (e) {
      console.log("LOAD ADDRESSES ERROR:", e);
      setAddrError("Lỗi tải địa chỉ");
    } finally {
      setAddrLoading(false);
    }
  };

  const openCreateAddressModal = () => {
    setAddressFormMode("create");
    setAddressForm({
      id: "",
      name: "Địa chỉ",
      receiver: "",
      phone: "",
      detail: "",
      isDefault: addresses.length === 0,
    });
    setShowAddressModal(true);
  };

  const openEditAddressModal = (a) => {
    setAddressFormMode("edit");
    setAddressForm({
      id: a.id,
      name: a.name || "Địa chỉ",
      receiver: a.receiver || "",
      phone: a.phone || "",
      detail: a.detail || "",
      isDefault: !!a.isDefault,
    });
    setShowAddressModal(true);
  };

  const closeAddressModal = () => {
    setShowAddressModal(false);
    setAddressFormMode("create");
    setAddressForm(emptyAddressForm);
  };

  const handleAddressFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmitAddress = async (e) => {
    e.preventDefault();

    const { userId } = getStoredAuth();
    if (!userId) return;

    if (
      !addressForm.receiver.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.detail.trim()
    ) {
      setAddrError("Vui lòng nhập đủ người nhận, SĐT và địa chỉ");
      return;
    }

    try {
      setAddrLoading(true);
      setAddrError("");

      let res;
      let data;

      if (addressFormMode === "create") {
        res = await fetch(`${API_BASE}/addresses`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            userId,
            name: addressForm.name || "Địa chỉ",
            receiver: addressForm.receiver,
            phone: addressForm.phone,
            detail: addressForm.detail,
            isDefault: addressForm.isDefault,
          }),
        });
      } else {
        res = await fetch(`${API_BASE}/addresses/${addressForm.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            name: addressForm.name || "Địa chỉ",
            receiver: addressForm.receiver,
            phone: addressForm.phone,
            detail: addressForm.detail,
            isDefault: addressForm.isDefault,
          }),
        });
      }

      data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAddrError(
          data?.message ||
            `${
              addressFormMode === "create" ? "Tạo" : "Cập nhật"
            } địa chỉ thất bại (${res.status})`,
        );
        return;
      }

      if (addressForm.isDefault && addressFormMode === "edit") {
        await setDefaultAddress(addressForm.id);
      } else {
        await loadAddresses();
      }

      closeAddressModal();
    } catch (e) {
      console.log("SUBMIT ADDRESS ERROR:", e);
      setAddrError("Lỗi lưu địa chỉ");
    } finally {
      setAddrLoading(false);
    }
  };

  const setDefaultAddress = async (id) => {
    try {
      setAddrLoading(true);
      setAddrError("");

      const res = await fetch(`${API_BASE}/addresses/${id}/default`, {
        method: "PATCH",
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAddrError(data?.message || `Đặt mặc định thất bại (${res.status})`);
        return;
      }

      await loadAddresses();
    } catch (e) {
      console.log("SET DEFAULT ADDRESS ERROR:", e);
      setAddrError("Lỗi đặt mặc định");
    } finally {
      setAddrLoading(false);
    }
  };

  const deleteAddress = async (id) => {
    if (!window.confirm("Xoá địa chỉ này?")) return;

    try {
      setAddrLoading(true);
      setAddrError("");

      const res = await fetch(`${API_BASE}/addresses/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAddrError(data?.message || `Xoá thất bại (${res.status})`);
        return;
      }

      await loadAddresses();
    } catch (e) {
      console.log("DELETE ADDRESS ERROR:", e);
      setAddrError("Lỗi xoá địa chỉ");
    } finally {
      setAddrLoading(false);
    }
  };

  const changePassword = async () => {
    const { userId } = getStoredAuth();
    setPwError("");

    if (!userId) {
      navigate("/login", { replace: true });
      return;
    }

    if (!pw.currentPassword || !pw.newPassword || !pw.confirmPassword) {
      setPwError("Vui lòng nhập đủ thông tin");
      return;
    }

    if (pw.newPassword !== pw.confirmPassword) {
      setPwError("Mật khẩu mới không khớp");
      return;
    }

    if (pw.newPassword.length < 6) {
      setPwError("Mật khẩu mới tối thiểu 6 ký tự");
      return;
    }

    try {
      setPwLoading(true);

      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          userId,
          currentPassword: pw.currentPassword,
          newPassword: pw.newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPwError(data?.message || `Đổi mật khẩu thất bại (${res.status})`);
        return;
      }

      alert("Đổi mật khẩu thành công!");
      setPw({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (e) {
      console.log("CHANGE PASSWORD ERROR:", e);
      setPwError("Lỗi server");
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "orders") loadOrders();
    if (activeTab === "addresses") loadAddresses();
  }, [activeTab]);

  const { logout } = useAuth();

  const handleLogout = () => {
    if (!window.confirm("Bạn có chắc muốn đăng xuất?")) return;

    window.dispatchEvent(new Event("cart-reset-after-logout"));
    window.dispatchEvent(new Event("user-changed"));

    logout();

    window.location.href = "/";
  };

  const filteredOrders = useMemo(() => {
    const keyword = orderKeyword.trim().toLowerCase();
    if (!keyword) return orders;
    return orders.filter((o) => String(o.id).toLowerCase().includes(keyword));
  }, [orders, orderKeyword]);

  const totalOrderPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ORDERS_PER_PAGE),
  );

  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, orderPage]);

  useEffect(() => {
    setOrderPage(1);
  }, [orderKeyword, orders.length, activeTab]);

  useEffect(() => {
    if (orderPage > totalOrderPages) {
      setOrderPage(totalOrderPages);
    }
  }, [orderPage, totalOrderPages]);

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return (
          <section className="pf-card">
            <h3 className="pf-title">Thông tin cá nhân</h3>

            {loadingUser ? <p className="muted">Đang tải...</p> : null}
            {error ? <div className="pf-error">{error}</div> : null}

            <div className="pf-grid">
              <div className="pf-field">
                <label>Họ và tên</label>
                <input
                  value={user.fullName}
                  onChange={(e) =>
                    setUser({ ...user, fullName: e.target.value })
                  }
                  disabled={loadingUser || savingUser}
                />
              </div>

              <div className="pf-field">
                <label>Email</label>
                <input value={user.email} disabled />
                <small>Email thường không chỉnh sửa trực tiếp</small>
              </div>

              <div className="pf-field">
                <label>Số điện thoại</label>
                <input
                  value={user.phoneNumber}
                  onChange={(e) =>
                    setUser({ ...user, phoneNumber: e.target.value })
                  }
                  disabled={loadingUser || savingUser}
                />
              </div>

              <div className="pf-field">
                <label>Avatar URL</label>
                <input
                  value={user.avatarUrl}
                  onChange={(e) =>
                    setUser({ ...user, avatarUrl: e.target.value })
                  }
                  disabled={loadingUser || savingUser}
                  placeholder="https://..."
                />
              </div>

              <div className="pf-field">
                <label>Giới tính</label>
                <select
                  value={user.gender}
                  onChange={(e) => setUser({ ...user, gender: e.target.value })}
                  disabled={loadingUser || savingUser}
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="pf-field">
                <label>Ngày sinh</label>
                <input
                  type="date"
                  value={user.birthday}
                  onChange={(e) =>
                    setUser({ ...user, birthday: e.target.value })
                  }
                  disabled={loadingUser || savingUser}
                />
              </div>
            </div>

            <div className="pf-actions">
              <button
                className="pf-btn-secondary"
                type="button"
                onClick={handleResetProfileForm}
                disabled={savingUser}
              >
                Huỷ
              </button>
              <button
                className="pf-btn-primary"
                type="button"
                onClick={handleSaveProfile}
                disabled={loadingUser || savingUser}
              >
                {savingUser ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </section>
        );

      case "orders":
        return (
          <section className="pf-card">
            <div className="pf-row">
              <h3 className="pf-title">Đơn hàng của tôi</h3>
              <div className="pf-filter">
                <input
                  placeholder="Tìm mã đơn hàng..."
                  value={orderKeyword}
                  onChange={(e) => setOrderKeyword(e.target.value)}
                />
              </div>
            </div>

            {ordersLoading ? <p className="muted">Đang tải...</p> : null}
            {ordersError ? <div className="pf-error">{ordersError}</div> : null}

            {!ordersLoading && !filteredOrders.length ? (
              <p className="muted">Chưa có đơn hàng nào.</p>
            ) : null}

            <div className="pf-table">
              <div className="pf-thead">
                <div>Mã đơn</div>
                <div>Ngày</div>
                <div>Tổng</div>
                <div>Trạng thái</div>
                <div></div>
              </div>

              {paginatedOrders.map((o) => (
                <div className="pf-tr" key={o.id}>
                  <div className="mono">{o.id}</div>
                  <div>{o.date || "—"}</div>
                  <div className="money">{formatMoney(o.total)}</div>
                  <div>
                    <span className={`pf-badge ${badgeClass(o.status)}`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="pf-tr-actions">
                    <button
                      className="pf-btn-link"
                      type="button"
                      onClick={() => openOrderDetailModal(o)}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!ordersLoading &&
            filteredOrders.length > 0 &&
            totalOrderPages > 1 ? (
              <div className="pf-pagination">
                <button
                  type="button"
                  className="pf-page-btn"
                  onClick={() => setOrderPage((prev) => Math.max(prev - 1, 1))}
                  disabled={orderPage === 1}
                >
                  ‹
                </button>

                {Array.from({ length: totalOrderPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      type="button"
                      className={`pf-page-btn ${
                        orderPage === page ? "active" : ""
                      }`}
                      onClick={() => setOrderPage(page)}
                    >
                      {page}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  className="pf-page-btn"
                  onClick={() =>
                    setOrderPage((prev) => Math.min(prev + 1, totalOrderPages))
                  }
                  disabled={orderPage === totalOrderPages}
                >
                  ›
                </button>
              </div>
            ) : null}
          </section>
        );

      case "addresses":
        return (
          <section className="pf-card">
            <div className="pf-row">
              <h3 className="pf-title">Sổ địa chỉ</h3>
              <button
                className="pf-btn-primary"
                type="button"
                onClick={openCreateAddressModal}
              >
                + Thêm địa chỉ
              </button>
            </div>

            {addrLoading ? <p className="muted">Đang tải...</p> : null}
            {addrError ? <div className="pf-error">{addrError}</div> : null}

            {!addrLoading && !addresses.length ? (
              <p className="muted">Chưa có địa chỉ nào.</p>
            ) : null}

            <div className="pf-list">
              {addresses.map((a) => (
                <div className="pf-address" key={a.id}>
                  <div className="pf-address-top">
                    <div className="pf-address-name">
                      <strong>{a.name}</strong>
                      {a.isDefault && <span className="pf-tag">Mặc định</span>}
                    </div>
                    <div className="pf-address-actions">
                      {!a.isDefault && (
                        <button
                          className="pf-btn-link"
                          type="button"
                          onClick={() => setDefaultAddress(a.id)}
                        >
                          Đặt mặc định
                        </button>
                      )}
                      <button
                        className="pf-btn-link"
                        type="button"
                        onClick={() => openEditAddressModal(a)}
                      >
                        Sửa
                      </button>
                      <button
                        className="pf-btn-link pf-btn-link-danger"
                        type="button"
                        onClick={() => deleteAddress(a.id)}
                      >
                        Xoá
                      </button>
                    </div>
                  </div>

                  <div className="pf-address-body">
                    <div>
                      <span className="muted">Người nhận:</span> {a.receiver}
                    </div>
                    <div>
                      <span className="muted">SĐT:</span> {a.phone}
                    </div>
                    <div>
                      <span className="muted">Địa chỉ:</span> {a.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case "security":
        return (
          <section className="pf-card">
            <h3 className="pf-title">Đổi mật khẩu</h3>

            {pwError ? <div className="pf-error">{pwError}</div> : null}

            <div className="pf-grid">
              <div className="pf-field">
                <label>Mật khẩu hiện tại</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={pw.currentPassword}
                  onChange={(e) =>
                    setPw({ ...pw, currentPassword: e.target.value })
                  }
                  disabled={pwLoading}
                />
              </div>

              <div className="pf-field">
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={pw.newPassword}
                  onChange={(e) =>
                    setPw({ ...pw, newPassword: e.target.value })
                  }
                  disabled={pwLoading}
                />
              </div>

              <div className="pf-field">
                <label>Nhập lại mật khẩu mới</label>
                <input
                  type="password"
                  placeholder="Nhập lại"
                  value={pw.confirmPassword}
                  onChange={(e) =>
                    setPw({ ...pw, confirmPassword: e.target.value })
                  }
                  disabled={pwLoading}
                />
              </div>
            </div>

            <div className="pf-actions">
              <button
                className="pf-btn-secondary"
                type="button"
                onClick={() =>
                  setPw({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  })
                }
                disabled={pwLoading}
              >
                Huỷ
              </button>
              <button
                className="pf-btn-primary"
                type="button"
                onClick={changePassword}
                disabled={pwLoading}
              >
                {pwLoading ? "Đang cập nhật..." : "Cập nhật"}
              </button>
            </div>

            <div className="pf-danger-zone">
              <h4>Đăng xuất</h4>
              <p className="muted">
                Bạn sẽ quay về trang chưa đăng nhập để tiếp tục mua sắm.
              </p>
              <button
                className="pf-btn-danger"
                type="button"
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  const avatar = user.avatarUrl?.trim()
    ? user.avatarUrl.trim()
    : fallbackAvatar;

  return (
    <div className="pf-wrap">
      <div className="pf-container">
        <aside className="pf-side">
          <div className="pf-user">
            <img className="pf-avatar" src={avatar} alt="avatar" />
            <div className="pf-user-meta">
              <div className="pf-user-name">{user.fullName || "—"}</div>
              <div className="pf-user-sub muted">{user.email || "—"}</div>
            </div>
          </div>

          <nav className="pf-nav">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`pf-nav-item ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="pf-main">{renderContent()}</main>
      </div>

      {showAddressModal && (
        <div className="pf-modal-overlay" onClick={closeAddressModal}>
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pf-modal-head">
              <h3 className="pf-title">
                {addressFormMode === "create"
                  ? "Thêm địa chỉ"
                  : "Chỉnh sửa địa chỉ"}
              </h3>
              <button
                type="button"
                className="pf-modal-close"
                onClick={closeAddressModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitAddress} className="pf-modal-form">
              <div className="pf-grid">
                <div className="pf-field">
                  <label>Tên địa chỉ</label>
                  <input
                    name="name"
                    value={addressForm.name}
                    onChange={handleAddressFormChange}
                    placeholder="Ví dụ: Nhà riêng, Công ty..."
                  />
                </div>

                <div className="pf-field">
                  <label>Người nhận</label>
                  <input
                    name="receiver"
                    value={addressForm.receiver}
                    onChange={handleAddressFormChange}
                    placeholder="Nhập tên người nhận"
                    required
                  />
                </div>

                <div className="pf-field">
                  <label>Số điện thoại</label>
                  <input
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressFormChange}
                    placeholder="Nhập số điện thoại"
                    required
                  />
                </div>

                <div className="pf-field pf-field-full">
                  <label>Địa chỉ chi tiết</label>
                  <input
                    name="detail"
                    value={addressForm.detail}
                    onChange={handleAddressFormChange}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                    required
                  />
                </div>

                <div className="pf-check">
                  <label>
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={addressForm.isDefault}
                      onChange={handleAddressFormChange}
                    />
                    Đặt làm địa chỉ mặc định
                  </label>
                </div>
              </div>

              <div className="pf-actions">
                <button
                  type="button"
                  className="pf-btn-secondary"
                  onClick={closeAddressModal}
                  disabled={addrLoading}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="pf-btn-primary"
                  disabled={addrLoading}
                >
                  {addrLoading
                    ? "Đang lưu..."
                    : addressFormMode === "create"
                      ? "Thêm địa chỉ"
                      : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOrderModal && selectedOrder && (
        <div className="pf-modal-overlay" onClick={closeOrderDetailModal}>
          <div
            className="pf-modal pf-order-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pf-modal-head">
              <h3 className="pf-title">Chi tiết đơn hàng</h3>
              <button
                type="button"
                className="pf-modal-close"
                onClick={closeOrderDetailModal}
              >
                ×
              </button>
            </div>

            <div className="pf-order-summary">
              <div>
                <strong>Mã đơn:</strong>{" "}
                <span className="mono">{selectedOrder.id}</span>
              </div>
              <div>
                <strong>Ngày đặt:</strong> {selectedOrder.date || "—"}
              </div>
              <div>
                <strong>Trạng thái:</strong>{" "}
                <span
                  className={`pf-badge ${badgeClass(selectedOrder.status)}`}
                >
                  {selectedOrder.status}
                </span>
              </div>
              <div>
                <strong>Thanh toán:</strong>{" "}
                {selectedOrder.paymentMethod || "—"}
                {selectedOrder.paymentStatus
                  ? ` — ${selectedOrder.paymentStatus}`
                  : ""}
              </div>
              <div>
                <strong>Tổng tiền:</strong>{" "}
                <span className="money">
                  {formatMoney(selectedOrder.total)}
                </span>
              </div>
              <div>
                <strong>Địa chỉ giao:</strong>{" "}
                {selectedOrder.shippingAddress || "—"}
              </div>
              {selectedOrder.note ? (
                <div>
                  <strong>Ghi chú:</strong> {selectedOrder.note}
                </div>
              ) : null}
            </div>

            <div className="pf-actions" style={{ marginTop: 12 }}>
              {canConfirmReceived(selectedOrder) && (
                <button
                  type="button"
                  className="pf-btn-primary"
                  onClick={() => handleConfirmReceived(selectedOrder)}
                  disabled={orderActionLoading === selectedOrder.orderId}
                >
                  {orderActionLoading === selectedOrder.orderId
                    ? "Đang xử lý..."
                    : "Đã nhận được hàng"}
                </button>
              )}

              {canCancelOrder(selectedOrder) && (
                <button
                  type="button"
                  className="pf-btn-danger"
                  onClick={() => handleCancelOrder(selectedOrder)}
                  disabled={orderActionLoading === selectedOrder.orderId}
                >
                  {orderActionLoading === selectedOrder.orderId
                    ? "Đang xử lý..."
                    : "Hủy đơn"}
                </button>
              )}
            </div>

            <div className="pf-order-items">
              <h4 className="pf-subtitle">Sản phẩm trong đơn</h4>

              {!selectedOrder.items?.length ? (
                <p className="muted">Không có dữ liệu sản phẩm.</p>
              ) : (
                selectedOrder.items.map((item, idx) => (
                  <div
                    className="pf-order-item"
                    key={`${selectedOrder.id}-${idx}`}
                  >
                    <div className="pf-order-item-left">
                      <img
                        src={
                          item.image ||
                          "https://via.placeholder.com/80x80?text=No+Image"
                        }
                        alt={item.name}
                        className="pf-order-item-image"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://via.placeholder.com/80x80?text=No+Image";
                        }}
                      />
                      <div className="pf-order-item-info">
                        <div className="pf-order-item-name">{item.name}</div>
                        <div className="pf-order-item-meta muted">
                          {item.color ? `Màu: ${item.color}` : ""}
                          {item.color && item.size ? " • " : ""}
                          {item.size ? `Size: ${item.size}` : ""}
                          {item.sku ? ` • SKU: ${item.sku}` : ""}
                        </div>
                        <div className="pf-order-item-meta muted">
                          SL: {item.quantity}
                        </div>
                        <div className="pf-order-item-price">
                          {formatMoney(item.price)} / sản phẩm
                        </div>
                      </div>
                    </div>

                    <div className="pf-order-item-right">
                      <div className="money">{formatMoney(item.subtotal)}</div>

                      {canReviewOrder(selectedOrder) && (
                        <button
                          type="button"
                          className="pf-btn-secondary"
                          onClick={() =>
                            handleReviewProduct(item, selectedOrder)
                          }
                          disabled={item.reviewed || !item.productId}
                        >
                          {item.reviewed
                            ? "Đã đánh giá"
                            : !item.productId
                              ? "Không tìm thấy sản phẩm"
                              : "Đánh giá sản phẩm"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pf-actions">
              <button
                type="button"
                className="pf-btn-secondary"
                onClick={closeOrderDetailModal}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function badgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("hoàn")) return "success";
  if (s.includes("huỷ") || s.includes("hủy") || s.includes("cancel"))
    return "danger";
  if (s.includes("giao") || s.includes("vận") || s.includes("ship"))
    return "warning";
  return "default";
}

function mapOrderStatus(beStatus) {
  switch (beStatus) {
    case "Pending":
      return "Chờ xác nhận";
    case "Confirmed":
      return "Đã xác nhận";
    case "Processing":
      return "Đang xử lý";
    case "Shipping":
      return "Đang giao";
    case "Delivered":
      return "Hoàn thành";
    case "Cancelled":
      return "Đã huỷ";
    case "Returned":
      return "Hoàn trả";
    default:
      return beStatus || "—";
  }
}
