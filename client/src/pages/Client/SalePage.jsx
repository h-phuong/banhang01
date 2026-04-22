/* eslint-disable react-hooks/immutability */
// pages/SalePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";

// Import component ProCardGrid của bạn vào đây
import ProCardGrid from "../../components/common/ProCard/ProCardGrid.jsx";

const API_BASE = "http://localhost:5000";

function extractProducts(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.docs)) return data.docs;
  if (Array.isArray(data.products)) return data.products;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.results)) return data.results;
  if (data.data && Array.isArray(data.data.products)) return data.data.products;
  if (data.products && Array.isArray(data.products.data))
    return data.products.data;
  if (data.result && Array.isArray(data.result.products))
    return data.result.products;
  return [];
}

function toAbsoluteImageUrl(url) {
  const value = String(url || "").trim();

  if (!value) return "https://via.placeholder.com/400x400?text=No+Image";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_BASE}${value}`;
  }

  return `${API_BASE}/${value}`;
}

function getMainImage(product) {
  if (typeof product?.thumbnail === "string" && product.thumbnail.trim()) {
    return toAbsoluteImageUrl(product.thumbnail);
  }

  if (Array.isArray(product?.images) && product.images.length > 0) {
    const first = product.images[0];

    if (typeof first === "string" && first.trim()) {
      return toAbsoluteImageUrl(first);
    }

    if (
      first &&
      typeof first === "object" &&
      typeof first.imageUrl === "string" &&
      first.imageUrl.trim()
    ) {
      return toAbsoluteImageUrl(first.imageUrl);
    }
  }

  return "https://via.placeholder.com/400x400?text=No+Image";
}

const SalePage = () => {
  const { addToCart } = useCart();

  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [suggestionSeed] = useState(() => Date.now() + Math.random());

  const pickRandomProducts = (items, count = 8) => {
    const list = Array.isArray(items) ? [...items] : [];

    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    return list.slice(0, count);
  };

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
  }, []);

  async function fetchCoupons() {
    try {
      const res = await axios.get(`${API_BASE}/api/coupons`);
      const activeCoupons = res.data.filter(
        (c) => c.endDate && new Date(c.endDate) >= new Date(),
      );
      setCoupons(activeCoupons);
    } catch (error) {
      console.error("Lỗi tải coupon:", error);
    } finally {
      setLoadingCoupons(false);
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/products?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache" },
      });

      const list = extractProducts(res.data);
      const activeProducts = list.filter(
        (product) =>
          String(product?.status || "ACTIVE").toUpperCase() === "ACTIVE",
      );

      setProducts(activeProducts.length > 0 ? activeProducts : list);
    } catch (error) {
      console.error("Lỗi tải sản phẩm:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCopyCode = (coupon) => {
    navigator.clipboard.writeText(coupon.code);

    const saved = JSON.parse(localStorage.getItem("savedCoupons")) || [];
    const exists = saved.find((c) => c.code === coupon.code);

    if (!exists) {
      saved.push(coupon);
      localStorage.setItem("savedCoupons", JSON.stringify(saved));
    }

    toast.success(`🎉 Đã lưu mã: ${coupon.code}`);
  };

  const formatDate = (dateString, isFlash) => {
    if (!dateString) return "Không có thời hạn";
    const date = new Date(dateString);

    if (isFlash) {
      return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    }

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const filteredCoupons = coupons.filter((c) => {
    if (activeTab === "all") return true;
    if (activeTab === "flash_sale") return c.isFlashSale;
    return c.type === activeTab;
  });

  const tabs = [
    { id: "all", label: "🌟 Tất cả" },
    { id: "flash_sale", label: "⚡ Flash Sale" },
    { id: "percent", label: "📊 Giảm %" },
    { id: "fixed", label: "💰 Giảm tiền" },
  ];

  const normalizedProducts = useMemo(() => {
    return products.map((p) => ({
      ...p,
      images: [getMainImage(p)],
      price: Number(p?.price || 0),
      isNew: Boolean(p?.isNew),
      isSale: Boolean(p?.isSale),
      isFeatured: true,
    }));
  }, [products]);

  const suggestedProducts = useMemo(() => {
    return pickRandomProducts(normalizedProducts, 8);
  }, [normalizedProducts, suggestionSeed]);

  return (
    <div className="sale-page-container fade-in pb-5">
      <style>{`
      .sale-page-container {
        background: #fff1f2;
        }
        /* --- HERO BANNER --- */
        .sale-hero {
          background: linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%);
          padding: 80px 0 60px;
          text-align: center;
          border-radius: 0 0 50px 50px;
          color: white;
          box-shadow: 0 10px 30px rgba(255, 75, 43, 0.3);
          margin-bottom: -40px;
          position: relative;
          z-index: 1;
        }

        /* --- TABS BỘ LỌC --- */
        .filter-section {
          position: relative;
          z-index: 2;
          width: fit-content;
          max-width: 100%;
          margin: 0 auto 32px;
          background: white;
          padding: 12px 14px;
          border-radius: 999px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.05);
        }

        .filter-tabs {
          display: flex;
          gap: 10px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          overflow-x: visible;
          scrollbar-width: none;
        }

        .filter-tabs::-webkit-scrollbar {
          display: none;
        }

        .tab-btn {
          padding: 10px 24px;
          border-radius: 30px;
          border: 1px solid transparent;
          background: #f8f9fa;
          color: #555;
          white-space: nowrap;
          font-weight: 600;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .tab-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .tab-btn.active {
          background: #FF416C;
          color: white;
          box-shadow: 0 4px 10px rgba(255, 65, 108, 0.3);
        }

        .tab-btn.active-flash {
          background: #f59e0b;
          color: white;
          box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
        }

        /* --- VOUCHER TICKET --- */
        .ticket-card {
          background: #fff;
          border-radius: 16px;
          position: relative;
          box-shadow: 0 4px 15px rgba(0,0,0,0.04);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          height: 100%;
          min-height: 190px;
          border: 1px solid #f1f1f1;
        }

        .ticket-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
        }

        .ticket-left {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%);
          width: 30%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: white;
          padding: 14px 8px;
          border-right: 2px dashed rgba(255,255,255,0.6);
          position: relative;
          text-align: center;
        }

        .ticket-card.flash-sale .ticket-left {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .ticket-left::after,
        .ticket-right::before {
          content: "";
          position: absolute;
          background-color: #f8f9fa;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          top: 50%;
          transform: translateY(-50%);
        }

        .ticket-left::after {
          right: -10px;
        }

        .ticket-right::before {
          left: -10px;
          z-index: 10;
        }

        .ticket-right {
          width: 70%;
          padding: 14px 14px 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
        }

        .ticket-right > div:first-child {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .ticket-right h5 {
          text-align: center;
          line-height: 1.35;
          font-size: 1rem;
          margin-bottom: 8px !important;
        }

        .ticket-right p {
          text-align: center;
          margin-bottom: 10px !important;
          line-height: 1.35 !important;
          font-size: 0.82rem;
        }

        .ticket-right .d-flex.align-items-center.mb-3 {
          justify-content: center;
          margin-bottom: 10px !important;
        }

        .ticket-right .d-flex.justify-content-between.align-items-end.mt-2 {
          flex-direction: column;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px;
          margin-top: 8px !important;
        }

        .ticket-left .fs-2 {
          font-size: 1.5rem !important;
          line-height: 1.1 !important;
        }

        .ticket-left .small {
          font-size: 0.72rem;
        }

        .ticket-left i {
          font-size: 1.4rem !important;
          margin-top: 10px !important;
        }

        .coupon-code {
          border: 1px dashed #ff6b6b;
          background: #fff5f5;
          color: #ff6b6b;
          padding: 5px 10px;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-weight: 800;
          font-size: 0.92rem;
          letter-spacing: 0.8px;
          display: inline-block;
          margin: 0 auto;
        }

        .flash-sale .coupon-code {
          border-color: #d97706;
          background: #fffbeb;
          color: #d97706;
        }

        .btn-copy {
          background-color: #ff6b6b;
          color: white;
          border: none;
          padding: 7px 16px;
          border-radius: 18px;
          font-size: 0.78rem;
          font-weight: bold;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-copy:active {
          transform: scale(0.95);
        }

        .flash-sale .btn-copy {
          background-color: #f59e0b;
        }

        .ticket-right .small.text-secondary {
          font-size: 0.74rem !important;
          text-align: center;
          line-height: 1.35;
        }

        #list-voucher .row.g-4 {
          --bs-gutter-x: 1rem;
          --bs-gutter-y: 1rem;
        }

        @media (min-width: 1200px) {
          .ticket-card {
            min-height: 185px;
          }
        }

        @media (max-width: 1199px) {
          .ticket-card {
            min-height: 190px;
          }
        }

        @media (max-width: 768px) {
          .filter-section {
            width: 100%;
            border-radius: 24px;
            padding: 12px;
          }

          .filter-tabs {
            justify-content: center;
            gap: 8px;
          }

          .tab-btn {
            padding: 10px 18px;
            font-size: 0.95rem;
          }
        }

        @media (max-width: 767px) {
          .ticket-card {
            flex-direction: column;
            min-height: auto;
          }

          .ticket-left,
          .ticket-right {
            width: 100%;
          }

          .ticket-left {
            border-right: none;
            border-bottom: 2px dashed rgba(255,255,255,0.6);
            padding: 14px 10px;
          }

          .ticket-left::after,
          .ticket-right::before {
            display: none;
          }

          .ticket-right {
            padding: 14px 12px;
          }
        }
      `}</style>

      <div className="sale-hero">
        <div className="container">
          <h1 className="fw-bold display-4 mb-3">🎉 ĐẠI TIỆC SIÊU SALE 🎉</h1>
          <p className="lead opacity-75 mb-0">
            Săn ngàn mã giảm giá - Chốt đơn không nhìn giá!
          </p>
        </div>
      </div>

      <div className="container">
        <div className="filter-section">
          <div className="filter-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${
                  activeTab === tab.id
                    ? tab.id === "flash_sale"
                      ? "active-flash"
                      : "active"
                    : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container pb-5" id="list-voucher">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold m-0">
            <i className="fas fa-ticket-alt text-danger me-2"></i>Mã Dành Cho
            Bạn
          </h3>
        </div>

        {loadingCoupons ? (
          <div className="text-center py-5">
            <div
              className="spinner-border text-danger"
              style={{ width: "3rem", height: "3rem" }}
            ></div>
          </div>
        ) : (
          <div className="row g-4">
            {filteredCoupons.map((c) => {
              return (
                <div
                  className="col-12 col-sm-6 col-lg-4 col-xl-3"
                  key={c._id || c.code}
                >
                  <div
                    className={
                      c.isFlashSale ? "ticket-card flash-sale" : "ticket-card"
                    }
                  >
                    <div className="ticket-left text-center">
                      <div
                        className="fs-2 fw-bold"
                        style={{ lineHeight: "1.2" }}
                      >
                        {c.type === "percent"
                          ? `${c.discountValue || 0}%`
                          : `${(c.discountValue || 0) / 1000}K`}
                      </div>
                      <div className="small fw-bold letter-spacing-1">GIẢM</div>
                      {c.isFlashSale ? (
                        <i className="fas fa-bolt mt-3 fa-2x opacity-50"></i>
                      ) : (
                        <i className="fas fa-gift mt-3 fa-2x opacity-50"></i>
                      )}
                    </div>

                    <div className="ticket-right">
                      <div>
                        <h5 className="fw-bold mb-2 text-dark d-flex align-items-center gap-2">
                          {c.name || "Mã giảm giá"}
                        </h5>
                        <p
                          className="text-muted small mb-3"
                          style={{ lineHeight: "1.4" }}
                        >
                          Đơn tối thiểu:{" "}
                          <strong className="text-dark">
                            {c.minOrderValue
                              ? c.minOrderValue.toLocaleString()
                              : 0}
                            đ
                          </strong>
                        </p>
                        <div className="d-flex align-items-center mb-3">
                          <span className="coupon-code">{c.code}</span>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-end mt-2">
                        <div
                          className="small text-secondary fw-500"
                          style={{ fontSize: "0.8rem" }}
                        >
                          <i className="far fa-clock me-1"></i> HSD:{" "}
                          {formatDate(c.endDate, c.isFlashSale)}
                        </div>
                        <button
                          className="btn-copy shadow-sm"
                          onClick={() => handleCopyCode(c)}
                        >
                          LƯU MÃ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!loadingCoupons && filteredCoupons.length === 0 && (
              <div className="col-12 text-center py-5 bg-white rounded-4 shadow-sm border">
                <img
                  src="https://cdn-icons-png.flaticon.com/512/7486/7486747.png"
                  width="120"
                  className="mb-3 opacity-50"
                  alt="empty"
                />
                <h5 className="text-muted fw-bold">Trời ơi, hết mã rồi!</h5>
                <p className="text-secondary">
                  Bạn thử chọn danh mục khác hoặc quay lại sau nhé.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="container pt-4 border-top">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold m-0">
            <i className="fas fa-fire text-danger me-2"></i>Gợi Ý Mua Sắm
          </h3>
          <Link
            to="/category"
            className="text-danger fw-bold text-decoration-none"
          >
            Xem tất cả <i className="fas fa-chevron-right ms-1"></i>
          </Link>
        </div>

        {loadingProducts ? (
          <div className="text-center py-4">
            <div className="spinner-border text-danger"></div>
          </div>
        ) : suggestedProducts.length > 0 ? (
          <div className="row g-4">
            {suggestedProducts.map((product) => (
              <div className="col-6 col-md-4 col-lg-3" key={product._id}>
                <ProCardGrid product={product} onAddToCart={addToCart} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted">
            Chưa có sản phẩm nào.
          </div>
        )}
      </div>
    </div>
  );
};

export default SalePage;
