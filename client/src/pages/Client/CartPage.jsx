import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import "./CartPage.css";

const API_BASE = "http://localhost:5000";

const paymentMethods = [
  { id: "cod", label: "COD" },
  { id: "momo", label: "MoMo" },
  { id: "vnpay", label: "VNPay" },
];

function toAbsoluteImageUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "/no-image.png";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_BASE}${value}`;
  return `${API_BASE}/${value}`;
}

function normalizeImages(product) {
  const out = [];
  if (typeof product?.thumbnail === "string" && product.thumbnail.trim())
    out.push(toAbsoluteImageUrl(product.thumbnail));
  if (Array.isArray(product?.images)) {
    product.images.forEach((it) => {
      if (typeof it === "string" && it.trim()) out.push(toAbsoluteImageUrl(it));
      else if (it && typeof it === "object" && typeof it.imageUrl === "string" && it.imageUrl.trim())
        out.push(toAbsoluteImageUrl(it.imageUrl));
    });
  }
  return Array.from(new Set(out));
}

function getVariantObject(product, variantId) {
  if (!product || !Array.isArray(product.variants)) return null;
  return product.variants.find((v) => String(v?._id) === String(variantId)) || null;
}

function getColorId(v) { return v?.color?._id || v?.colorId || ""; }
function getSizeId(v) { return v?.size?._id || v?.sizeId || ""; }
function getColorName(v) {
  if (!v) return "";
  if (typeof v.color === "object" && v.color) return v.color.name || "";
  return v.colorName || "";
}
function getSizeName(v) {
  if (!v) return "";
  if (typeof v.size === "object" && v.size) return v.size.name || "";
  return v.sizeName || "";
}
function getVariantStock(variant) {
  return Number(variant?.stock ?? variant?.quantity ?? variant?.inventory ?? 0);
}
function getVariantPrice(product, variant) {
  if (variant?.price != null) return Number(variant.price || 0);
  if (product?.promotionalPrice != null && Number(product.promotionalPrice) > 0)
    return Number(product.promotionalPrice || 0);
  return Number(product?.price || 0);
}
function getAvailableColors(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const unique = new Map();
  variants.forEach((v) => {
    const colorId = getColorId(v);
    const colorName = getColorName(v);
    if (colorId && colorName && colorName !== "Default")
      unique.set(String(colorId), { _id: colorId, name: colorName });
  });
  return Array.from(unique.values());
}
function getAvailableSizesByColor(product, colorId) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const unique = new Map();
  variants
    .filter((v) => String(getColorId(v)) === String(colorId))
    .forEach((v) => {
      const sizeId = getSizeId(v);
      const sizeName = getSizeName(v);
      if (sizeId && sizeName && sizeName !== "Default")
        unique.set(String(sizeId), { _id: sizeId, name: sizeName });
    });
  return Array.from(unique.values());
}
function findVariantByOptions(product, colorId, sizeId) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return variants.find(
    (v) => String(getColorId(v)) === String(colorId) && String(getSizeId(v)) === String(sizeId)
  ) || null;
}

export default function CartPage() {
  const navigate = useNavigate();
  const { cartItems = [], cartLoading, updateQuantity, removeFromCart, updateVariant } = useCart();

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [authUser, setAuthUser] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [productMap, setProductMap] = useState({});

  // ── MỚI: state lưu các item được chọn (Set of _key) ──
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const shippingFee = 30000;

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");
      setAuthUser(rawUser ? JSON.parse(rawUser) : null);
    } catch { setAuthUser(null); }
  }, []);

  useEffect(() => { fetchMissingProducts(); }, [cartItems]);

  const fetchMissingProducts = async () => {
    try {
      const ids = Array.from(new Set(
        cartItems.map((item) => typeof item.productId === "object" ? item.productId?._id : item.productId).filter(Boolean)
      ));
      const missingIds = ids.filter((id) => !productMap[id]);
      if (!missingIds.length) return;
      const responses = await Promise.allSettled(
        missingIds.map((id) => axios.get(`${API_BASE}/api/products/${id}`))
      );
      const nextMap = {};
      responses.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value?.data)
          nextMap[missingIds[index]] = result.value.data;
      });
      if (Object.keys(nextMap).length > 0)
        setProductMap((prev) => ({ ...prev, ...nextMap }));
    } catch (error) { console.error("Lỗi load product details cho cart:", error); }
  };

  const normalizedCartItems = useMemo(() => {
    return cartItems.map((item, index) => {
      const rawProduct = typeof item.productId === "object" ? item.productId : productMap[item.productId] || null;
      const productId = typeof item.productId === "object" ? item.productId?._id : item.productId || "";
      const variantId = typeof item.variantId === "object" ? item.variantId?._id : item.variantId || "";
      const variant = getVariantObject(rawProduct, variantId);
      const images = normalizeImages(rawProduct);
      const price = getVariantPrice(rawProduct, variant);
      const currentColorId = String(getColorId(variant) || "");
      const currentSizeId = String(getSizeId(variant) || "");
      const availableColors = rawProduct ? getAvailableColors(rawProduct) : [];
      const availableSizes = rawProduct && currentColorId ? getAvailableSizesByColor(rawProduct, currentColorId) : [];
      return {
        ...item,
        _key: item._id || `${productId}_${variantId}_${index}`,
        itemId: item._id || "",
        productId, variantId, product: rawProduct, variant,
        name: rawProduct?.name || "Sản phẩm",
        image: images[0] || "/no-image.png",
        price, stock: getVariantStock(variant),
        status: rawProduct?.status || "ACTIVE",
        color: getColorName(variant) || "-",
        size: getSizeName(variant) || "-",
        currentColorId, currentSizeId, availableColors, availableSizes,
      };
    });
  }, [cartItems, productMap]);

  // ── Khi cartItems thay đổi, auto-select tất cả item hợp lệ ──
  useEffect(() => {
    const validKeys = new Set(
      normalizedCartItems
        .filter((item) => item.status === "ACTIVE" && Number(item.stock || 0) > 0)
        .map((item) => item._key)
    );
    setSelectedKeys(validKeys);
  }, [cartItems]);

  // ── Items được chọn ──
  const selectedItems = useMemo(
    () => normalizedCartItems.filter((item) => selectedKeys.has(item._key)),
    [normalizedCartItems, selectedKeys]
  );

  const allValidItems = useMemo(
    () => normalizedCartItems.filter((item) => item.status === "ACTIVE" && Number(item.stock || 0) > 0),
    [normalizedCartItems]
  );

  const isAllSelected = allValidItems.length > 0 && allValidItems.every((item) => selectedKeys.has(item._key));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allValidItems.map((item) => item._key)));
    }
  };

  const toggleSelectItem = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── Tính toán dựa trên items được chọn ──
  const subtotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }, [selectedItems]);

  const totalProducts = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [selectedItems]);


  const buildDiscountAmount = (coupon, currentSubtotal) => {
    if (!coupon) return 0;
    const minOrderValue = Number(coupon.minOrderValue || 0);
    const discountValue = Number(coupon.discountValue || 0);
    if (minOrderValue > 0 && currentSubtotal < minOrderValue) return 0;
    let amount = 0;
    if (coupon.type === "percent") amount = Math.round(currentSubtotal * (discountValue / 100));
    else if (coupon.type === "fixed") amount = discountValue;
    return Math.max(0, Math.min(amount, currentSubtotal));
  };

  const discount = useMemo(() => buildDiscountAmount(appliedCoupon, subtotal), [appliedCoupon, subtotal]);

  const total = useMemo(() => {
    const value = subtotal + shippingFee - discount;
    return value > 0 ? value : 0;
  }, [subtotal, shippingFee, discount]);

  const formatPrice = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";

  const handleDecrease = async (item) => {
    if (Number(item.quantity || 0) <= 1) return;
    const result = await updateQuantity({ itemId: item.itemId, productId: item.productId, variantId: item.variantId, amount: -1 });
    if (!result?.success) alert(result?.message || "Không thể giảm số lượng");
  };

  const handleIncrease = async (item) => {
    if (Number(item.stock || 0) > 0 && Number(item.quantity || 0) >= Number(item.stock || 0)) {
      alert(`Chỉ còn ${item.stock} sản phẩm`); return;
    }
    const result = await updateQuantity({ itemId: item.itemId, productId: item.productId, variantId: item.variantId, amount: 1 });
    if (!result?.success) alert(result?.message || "Không thể tăng số lượng");
  };

  const handleQtyInput = async (item, nextValue) => {
    const raw = Number(nextValue);
    if (!Number.isFinite(raw) || raw <= 0) return;
    const qty = Math.max(1, raw);
    if (Number(item.stock || 0) > 0 && qty > Number(item.stock || 0)) {
      alert(`Số lượng vượt tồn kho. Chỉ còn ${item.stock} sản phẩm`); return;
    }
    const amount = qty - Number(item.quantity || 0);
    if (amount === 0) return;
    const result = await updateQuantity({ itemId: item.itemId, productId: item.productId, variantId: item.variantId, amount });
    if (!result?.success) alert(result?.message || "Không thể cập nhật số lượng");
  };

  const handleRemove = async (item) => {
    const result = await removeFromCart({ itemId: item.itemId, productId: item.productId, variantId: item.variantId });
    if (!result?.success) alert(result?.message || "Không thể xóa sản phẩm");
  };

  const handleChangeColor = async (item, newColorId) => {
    if (!item.product || !newColorId) return;
    const sizes = getAvailableSizesByColor(item.product, newColorId);
    const nextSizeId = sizes.find((s) => String(s._id) === String(item.currentSizeId))?._id || sizes[0]?._id;
    if (!nextSizeId) { alert("Không tìm thấy kích thước phù hợp"); return; }
    const nextVariant = findVariantByOptions(item.product, newColorId, nextSizeId);
    if (!nextVariant?._id) { alert("Không tìm thấy biến thể phù hợp"); return; }
    const nextStock = getVariantStock(nextVariant);
    if (nextStock <= 0) { alert("Biến thể đã chọn hiện đang hết hàng"); return; }
    if (Number(item.quantity || 0) > nextStock) { alert(`Biến thể mới chỉ còn ${nextStock} sản phẩm`); return; }
    const result = await updateVariant({ itemId: item.itemId, productId: item.productId, oldVariantId: item.variantId, newVariantId: nextVariant._id });
    if (!result?.success) alert(result?.message || "Không thể đổi màu");
  };

  const handleChangeSize = async (item, newSizeId) => {
    if (!item.product || !item.currentColorId || !newSizeId) return;
    const nextVariant = findVariantByOptions(item.product, item.currentColorId, newSizeId);
    if (!nextVariant?._id) { alert("Không tìm thấy biến thể phù hợp"); return; }
    const nextStock = getVariantStock(nextVariant);
    if (nextStock <= 0) { alert("Biến thể đã chọn hiện đang hết hàng"); return; }
    if (Number(item.quantity || 0) > nextStock) { alert(`Biến thể mới chỉ còn ${nextStock} sản phẩm`); return; }
    const result = await updateVariant({ itemId: item.itemId, productId: item.productId, oldVariantId: item.variantId, newVariantId: nextVariant._id });
    if (!result?.success) alert(result?.message || "Không thể đổi kích thước");
  };


  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán");
      return;
    }
    const invalidItem = selectedItems.find(
      (item) => item.status !== "ACTIVE" || Number(item.stock || 0) <= 0 ||
        Number(item.quantity || 0) > Number(item.stock || 0)
    );
    if (invalidItem) { alert("Trong giỏ có sản phẩm không còn hợp lệ để thanh toán"); return; }

    navigate("/checkout", {
      state: {
        items: selectedItems.map((item) => ({
          itemId: item.itemId, productId: item.productId, variantId: item.variantId,
          name: item.name, image: item.image, price: item.price,
          quantity: item.quantity, size: item.size, color: item.color,
        })),
        paymentMethod,
        vouchers: appliedCoupon ? [{ code: appliedCoupon.code, type: appliedCoupon.type, discountAmount: discount }] : [],
        subtotal, shippingFee, discount, total,
      },
    });
  };

  if (cartLoading) {
    return (
      <div className="cart-page">
        <div className="container">
          <h1 className="cart-page__title">Giỏ Hàng Của Tôi</h1>
          <div className="cart-empty-box">
            <div className="cart-empty-box__icon">🛍️</div>
            <h2 className="cart-empty-box__title">Đang tải giỏ hàng</h2>
            <p className="cart-empty-box__text">Hệ thống đang đồng bộ sản phẩm của bạn.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!normalizedCartItems.length) {
    return (
      <div className="cart-page">
        <div className="container">
          <h1 className="cart-page__title">Giỏ Hàng Của Tôi</h1>
          <div className="cart-empty-box cart-empty-box--fancy">
            <h2 className="cart-empty-box__title">Giỏ hàng đang trống</h2>
            <p className="cart-empty-box__text">Bạn chưa có sản phẩm nào trong giỏ. Hãy khám phá thêm để chọn món đồ phù hợp nhé.</p>
            <button type="button" className="cart-empty-box__btn" onClick={() => navigate("/category")}>
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="cart-page__title">Giỏ Hàng Của Tôi</h1>

        <div className="cart-layout">
          <div className="cart-left">
            {/* ── Header chọn tất cả ── */}
            <div className="cart-table-head">
              <label className="cart-select-all">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="cart-checkbox"
                />
                <span>Chọn tất cả ({allValidItems.length})</span>
              </label>
              <span>Số Lượng</span>
            </div>

            <div className="cart-list">
              {normalizedCartItems.map((item) => {
                const cannotBuy = item.status !== "ACTIVE" || Number(item.stock || 0) <= 0;
                const isSelected = selectedKeys.has(item._key);

                return (
                  <div
                    className={`cart-row ${isSelected ? "cart-row--selected" : ""} ${cannotBuy ? "cart-row--disabled" : ""}`}
                    key={item._key}
                  >
                    {/* Checkbox chọn sản phẩm */}
                    <input
                      type="checkbox"
                      className="cart-checkbox cart-checkbox--item"
                      checked={isSelected}
                      disabled={cannotBuy}
                      onChange={() => toggleSelectItem(item._key)}
                    />

                    <button className="cart-remove" onClick={() => handleRemove(item)} type="button">×</button>

                    <div className="cart-product">
                      <img
                        className="cart-product__img"
                        src={item.image || "/no-image.png"}
                        alt={item.name}
                        onError={(e) => { e.target.src = "/no-image.png"; }}
                      />
                      <div className="cart-product__content">
                        <h3 className="cart-product__name">{item.name}</h3>
                        <div className="cart-product__price">{formatPrice(item.price)}</div>

                        <div className="cart-product__meta">
                          <div className="cart-product__meta-row">
                            <span className="cart-product__meta-label">Size:</span>
                            {item.availableSizes?.length > 0 ? (
                              <select className="cart-select" value={item.currentSizeId || ""}
                                onChange={(e) => handleChangeSize(item, e.target.value)} disabled={cannotBuy}>
                                {item.availableSizes.map((size) => (
                                  <option key={size._id} value={size._id}>{size.name}</option>
                                ))}
                              </select>
                            ) : (<span>{item.size || "-"}</span>)}
                          </div>

                          <div className="cart-product__meta-row">
                            <span className="cart-product__meta-label">Color:</span>
                            {item.availableColors?.length > 0 ? (
                              <select className="cart-select" value={item.currentColorId || ""}
                                onChange={(e) => handleChangeColor(item, e.target.value)} disabled={cannotBuy}>
                                {item.availableColors.map((color) => (
                                  <option key={color._id} value={color._id}>{color.name}</option>
                                ))}
                              </select>
                            ) : (<span>{item.color || "-"}</span>)}
                          </div>

                          <div className="cart-product__meta-row">
                            <span className="cart-product__meta-label">Kho:</span>
                            <span>{cannotBuy ? "Không khả dụng" : `Còn ${item.stock}`}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="cart-qty-wrap">
                      <div className="cart-qty">
                        <button type="button" onClick={() => handleDecrease(item)}
                          disabled={cannotBuy || Number(item.quantity || 0) <= 1}>−</button>
                        <input className="cart-qty-input" type="number" min="1"
                          max={item.stock > 0 ? item.stock : undefined}
                          value={item.quantity} disabled={cannotBuy}
                          onChange={(e) => handleQtyInput(item, e.target.value)} />
                        <button type="button" onClick={() => handleIncrease(item)}
                          disabled={cannotBuy || (item.stock > 0 && Number(item.quantity || 0) >= Number(item.stock || 0))}>+</button>
                      </div>

                      {/* Thành tiền từng item */}
                      {isSelected && !cannotBuy && (
                        <div className="cart-item-total">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Thanh action bottom ── */}
            {selectedItems.length > 0 && (
              <div className="cart-bottom-bar">
                <span className="cart-bottom-bar__count">
                  Đã chọn <strong>{selectedItems.length}</strong> sản phẩm
                </span>
                <span className="cart-bottom-bar__total">
                  Tổng: <strong style={{ color: "#d61a72" }}>{formatPrice(subtotal)}</strong>
                </span>
              </div>
            )}
          </div>

          <aside className="cart-summary">
            <h2 className="cart-summary__title">Tóm Tắt Đơn Hàng</h2>


            <div className="cart-summary__body">
              <div className="cart-summary__line">
                <span>{totalProducts} sản phẩm được chọn</span>
                <span></span>
              </div>
              <div className="cart-summary__line">
                <span>Tạm tính</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="cart-summary__line">
                <span>Phí vận chuyển</span>
                <span>{formatPrice(shippingFee)}</span>
              </div>
              <div className="cart-summary__line cart-summary__line--discount">
                <span>Giảm giá</span>
                <span>-{formatPrice(discount)}</span>
              </div>
              <div className="cart-summary__divider"></div>
              <div className="cart-summary__line cart-summary__line--total">
                <span>Tổng cộng</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              className="cart-summary__checkout"
              onClick={handleCheckout}
              type="button"
              disabled={selectedItems.length === 0}
              style={{ opacity: selectedItems.length === 0 ? 0.5 : 1 }}
            >
              Thanh Toán ({selectedItems.length})
            </button>
          </aside>
        </div>
      </div>

    </div>
  );
}
