import React, { useEffect, useMemo, useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { toast } from "react-toastify";
import "./Product.css";

const API_BASE = "http://localhost:5000";

function toAbsoluteImageUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${API_BASE}${value}`;
  }

  return `${API_BASE}/${value}`;
}

function normalizeImages(product) {
  const out = [];

  if (typeof product?.thumbnail === "string" && product.thumbnail.trim()) {
    out.push(toAbsoluteImageUrl(product.thumbnail));
  }

  if (Array.isArray(product?.images)) {
    product.images.forEach((it) => {
      if (typeof it === "string" && it.trim()) {
        out.push(toAbsoluteImageUrl(it));
      } else if (
        it &&
        typeof it === "object" &&
        typeof it.imageUrl === "string" &&
        it.imageUrl.trim()
      ) {
        out.push(toAbsoluteImageUrl(it.imageUrl));
      }
    });
  }

  return Array.from(new Set(out));
}

function getItemId(item) {
  return item?._id || item?.id || item?.productId || null;
}

function getRelatedImage(item) {
  if (typeof item?.thumbnail === "string" && item.thumbnail.trim()) {
    return toAbsoluteImageUrl(item.thumbnail);
  }

  if (Array.isArray(item?.images) && item.images.length > 0) {
    const first = item.images[0];

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

  return "https://via.placeholder.com/600x800?text=No+Image";
}

function getCategoryId(item) {
  return (
    item?.categoryId?._id ||
    item?.categoryId?.id ||
    item?.category?._id ||
    item?.category?.id ||
    item?.categoryId ||
    item?.category ||
    null
  );
}

function getProductStock(item) {
  if (Array.isArray(item?.variants) && item.variants.length > 0) {
    return item.variants.reduce((sum, v) => sum + Number(v?.quantity || 0), 0);
  }

  return Number(item?.quantity ?? item?.stock ?? item?.inventory ?? 0);
}

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const [activeImg, setActiveImg] = useState(0);
  const [thumbStart, setThumbStart] = useState(0);
  const [activeTab, setActiveTab] = useState("reviews");
  const [openSection, setOpenSection] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviewPermission, setReviewPermission] = useState(null);

  const THUMB_VISIBLE = 4;

  const orderCodeFromQuery = searchParams.get("orderCode") || "";
  const reviewFromQuery = searchParams.get("review") || "";
  const orderCodeFromState = location?.state?.orderCode || "";
  const shouldOpenReview =
    reviewFromQuery === "1" || location?.state?.openReview === true;
  const reviewOrderCode = orderCodeFromQuery || orderCodeFromState || "";

  const fetchReviews = async (productId) => {
    try {
      const res = await fetch(`${API_BASE}/api/reviews/product/${productId}`);
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Fetch review error:", err);
      setReviews([]);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `${API_BASE}/api/products/${id}?t=${Date.now()}`,
          {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          },
        );

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message || "Không lấy được chi tiết sản phẩm");
        }

        if (!isMounted) return;

        setProduct(data);
        setSelectedColor(null);
        setSelectedSize(null);
        setQuantity(1);
        setActiveImg(0);
        setThumbStart(0);
        setOpenSection(null);
      } catch (err) {
        console.error("Fetch product error:", err);
        if (!isMounted) return;
        setProduct(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchRelated = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products/related/${id}`);
        const data = await res.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setRelatedProducts(data);
          return;
        }

        if (Array.isArray(data?.docs)) {
          setRelatedProducts(data.docs);
          return;
        }

        setRelatedProducts([]);
      } catch (err) {
        console.log("Fetch related error:", err);
        if (!isMounted) return;
        setRelatedProducts([]);
      }
    };

    fetchProduct();
    fetchReviews(id);
    fetchRelated();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (shouldOpenReview) {
      setActiveTab("reviews");
    }
  }, [shouldOpenReview]);

  useEffect(() => {
    const checkReviewPermission = async () => {
      if (!id || !reviewOrderCode) {
        setReviewPermission(null);
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/api/reviews/check/${id}?orderCode=${encodeURIComponent(reviewOrderCode)}`,
        );
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setReviewPermission(null);
          return;
        }

        setReviewPermission(data);
      } catch (err) {
        console.log("Check review permission error:", err);
        setReviewPermission(null);
      }
    };

    checkReviewPermission();
  }, [id, reviewOrderCode]);

  const variants = useMemo(
    () => (Array.isArray(product?.variants) ? product.variants : []),
    [product],
  );

  const productStatus = useMemo(() => {
    return String(product?.status || "ACTIVE").toUpperCase();
  }, [product]);

  const isInactive = productStatus === "INACTIVE";

  const colors = useMemo(() => {
    if (!variants.length) return [];
    const unique = new Map();

    variants.forEach((v) => {
      if (v?.color?._id) {
        unique.set(v.color._id, v.color);
      }
    });

    return Array.from(unique.values());
  }, [variants]);

  const sizes = useMemo(() => {
    if (!variants.length || !selectedColor) return [];
    const unique = new Map();

    variants
      .filter((v) => v?.color?._id === selectedColor)
      .forEach((v) => {
        if (v?.size?._id) {
          unique.set(v.size._id, v.size);
        }
      });

    return Array.from(unique.values());
  }, [variants, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (!variants.length || !selectedColor || !selectedSize) return null;

    return (
      variants.find(
        (v) => v?.color?._id === selectedColor && v?.size?._id === selectedSize,
      ) || null
    );
  }, [variants, selectedColor, selectedSize]);

  const gallery = useMemo(() => normalizeImages(product), [product]);

  const mainImage =
    gallery[activeImg] || "https://via.placeholder.com/600x800?text=No+Image";

  const hasSale = useMemo(() => {
    return (
      Number(product?.oldPrice || 0) > Number(product?.price || 0) ||
      Number(product?.promotionalPrice || 0) > 0
    );
  }, [product]);

  const displayPrice = useMemo(() => {
    const promo = product?.promotionalPrice;
    const base = product?.price;
    return Number(promo ?? base ?? 0);
  }, [product]);

  const oldPrice = useMemo(() => {
    return Number(product?.oldPrice || 0);
  }, [product]);

  const totalStock = useMemo(() => {
    if (selectedVariant) return Number(selectedVariant.quantity || 0);

    if (variants.length > 0) {
      return variants.reduce((sum, v) => sum + Number(v.quantity || 0), 0);
    }

    return Number(
      product?.quantity ?? product?.stock ?? product?.inventory ?? 0,
    );
  }, [product, variants, selectedVariant]);

  const isOutOfStock = totalStock <= 0;
  const cannotBuy = isOutOfStock || isInactive;

  const ratingStats = useMemo(() => {
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    reviews.forEach((r) => {
      const value = Number(r?.rating || 0);
      if (value >= 1 && value <= 5) {
        stats[value] = (stats[value] || 0) + 1;
      }
    });

    const total = reviews.length;
    const avg =
      total === 0
        ? 0
        : (
            reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / total
          ).toFixed(1);

    return { stats, total, avg };
  }, [reviews]);

  const filteredRelatedProducts = useMemo(() => {
    const currentCategoryId = getCategoryId(product);
    const currentId = String(id);

    if (!Array.isArray(relatedProducts)) return [];

    return relatedProducts.filter((item) => {
      const itemId = String(getItemId(item) || "");
      const itemCategoryId = getCategoryId(item);

      if (!itemId || itemId === currentId) return false;
      if (!currentCategoryId) return true;

      return String(itemCategoryId || "") === String(currentCategoryId);
    });
  }, [relatedProducts, product, id]);

  const thumbEnd = Math.min(thumbStart + THUMB_VISIBLE, gallery.length);
  const visibleThumbs = gallery.slice(thumbStart, thumbEnd);
  const canPrevThumb = thumbStart > 0;
  const canNextThumb = thumbEnd < gallery.length;

  const handlePrevThumb = () => {
    if (!canPrevThumb) return;
    setThumbStart((s) => Math.max(0, s - 1));
  };

  const handleNextThumb = () => {
    if (!canNextThumb) return;
    setThumbStart((s) =>
      Math.min(Math.max(gallery.length - THUMB_VISIBLE, 0), s + 1),
    );
  };

  const handlePickThumb = (absoluteIndex) => {
    setActiveImg(absoluteIndex);
  };

  const handleDecQty = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  const handleIncQty = () => {
    const maxQty = selectedVariant
      ? Number(selectedVariant.quantity || 0)
      : totalStock;

    if (maxQty > 0) {
      setQuantity((q) => (q < maxQty ? q + 1 : q));
    }
  };

  const buildCheckoutItem = () => {
    if (!product) return null;

    if (variants.length > 0) {
      if (!selectedVariant) {
        toast.error("Vui lòng chọn màu và size");
        return null;
      }

      if (quantity > Number(selectedVariant.quantity || 0)) {
        toast.error("Số lượng vượt quá tồn kho");
        return null;
      }

      return {
        itemId:
          selectedVariant._id ||
          `${product._id || product.id}-${selectedVariant._id}`,
        productId: product._id || product.id,
        variantId: selectedVariant._id || null,
        name: product.name,
        image: mainImage,
        color: selectedVariant?.color?.name || "-",
        size: selectedVariant?.size?.name || "-",
        quantity,
        price: Number(product.promotionalPrice ?? product.price ?? 0),
      };
    }

    return {
      itemId: product._id || product.id,
      productId: product._id || product.id,
      variantId: null,
      name: product.name,
      image: mainImage,
      color: "-",
      size: "-",
      quantity,
      price: Number(product.promotionalPrice ?? product.price ?? 0),
    };
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (isInactive) {
      toast.error("Sản phẩm hiện đã hết hàng");
      return;
    }

    if (isOutOfStock) {
      toast.error("Sản phẩm hiện đã hết hàng");
      return;
    }

    if (variants.length > 0) {
      if (!selectedVariant) {
        toast.error("Vui lòng chọn màu và size");
        return;
      }

      if (quantity > Number(selectedVariant.quantity || 0)) {
        toast.error("Số lượng vượt quá tồn kho");
        return;
      }

      addToCart({
        productId: product._id || product.id,
        variantId: selectedVariant ? selectedVariant._id : null,
        quantity,
      });

      toast.success("Đã thêm vào giỏ hàng!");
      return;
    }

    addToCart(
      {
        _id: product._id || product.id,
        name: product.name,
        price: Number(product.promotionalPrice ?? product.price ?? 0),
        image: mainImage,
      },
      quantity,
    );

    toast.success("Đã thêm vào giỏ hàng!");
  };

  const handleBuyNow = () => {
    if (!product) return;

    if (isInactive) {
      toast.error("Sản phẩm hiện đã hết hàng");
      return;
    }

    if (isOutOfStock) {
      toast.error("Sản phẩm hiện đã hết hàng");
      return;
    }

    const checkoutItem = buildCheckoutItem();
    if (!checkoutItem) return;

    const subtotal =
      Number(checkoutItem.price || 0) * Number(checkoutItem.quantity || 1);

    navigate("/checkout", {
      state: {
        items: [checkoutItem],
        paymentMethod: "cod",
        vouchers: [],
        subtotal,
        shippingFee: 30000,
        discount: 0,
        buyNowItem: checkoutItem,
      },
    });
  };

  const handleSendReview = async () => {
    if (!rating || !comment.trim()) {
      toast.error("Vui lòng nhập đánh giá");
      return;
    }

    if (!reviewOrderCode) {
      toast.error("Vui lòng đi từ đơn hàng đã giao để đánh giá");
      return;
    }

    if (reviewPermission?.reviewed) {
      toast.error("Sản phẩm trong đơn hàng này đã được đánh giá rồi");
      return;
    }

    if (reviewPermission && reviewPermission.canReview === false) {
      toast.error("Đơn hàng không hợp lệ để đánh giá sản phẩm này");
      return;
    }

    try {
      const body = {
        product: id,
        rating,
        comment,
        orderCode: reviewOrderCode,
      };

      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Lỗi gửi đánh giá");
      }

      toast.success(data?.message || "Đã gửi đánh giá");
      setRating(0);
      setComment("");
      fetchReviews(id);
      setActiveTab("reviews");
      setReviewPermission((prev) =>
        prev
          ? {
              ...prev,
              canReview: false,
              reviewed: true,
            }
          : prev,
      );
    } catch (err) {
      toast.error(err?.message || "Lỗi gửi đánh giá");
    }
  };

  const handleOpenRelatedProduct = (item) => {
    const nextId = getItemId(item);

    if (!nextId) {
      toast.error("Không lấy được id sản phẩm");
      return;
    }

    if (String(nextId) === String(id)) return;

    navigate(`/product/${nextId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return <div className="pd-wrap">Đang tải...</div>;
  if (!product) return <div className="pd-wrap">Không tìm thấy sản phẩm</div>;

  return (
    <div className="pd-wrap">
      <div className="pd-card">
        <div className="pd-left">
          <div className="pd-mainImgBox">
            <img className="pd-mainImg" src={mainImage} alt={product.name} />

            {(isInactive || isOutOfStock) && (
              <div className="pd-soldout">HẾT HÀNG</div>
            )}
          </div>

          {gallery.length > 0 && (
            <div className="pd-thumbRow">
              <button
                type="button"
                className={`pd-nav ${canPrevThumb ? "" : "disabled"}`}
                onClick={handlePrevThumb}
                disabled={!canPrevThumb}
                aria-label="prev thumbs"
              >
                ‹
              </button>

              <div className="pd-thumbs">
                {visibleThumbs.map((src, i) => {
                  const absIndex = thumbStart + i;
                  const isActive = absIndex === activeImg;

                  return (
                    <button
                      type="button"
                      key={`${src}-${absIndex}`}
                      className={`pd-thumb ${isActive ? "active" : ""}`}
                      onClick={() => handlePickThumb(absIndex)}
                    >
                      <img src={src} alt={`thumb-${absIndex}`} />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className={`pd-nav ${canNextThumb ? "" : "disabled"}`}
                onClick={handleNextThumb}
                disabled={!canNextThumb}
                aria-label="next thumbs"
              >
                ›
              </button>
            </div>
          )}
        </div>

        <div className="pd-right">
          <h1 className="pd-title">{product.name}</h1>

          <div className="pd-brand">
            Thương Hiệu: <b>{product.brand || "LocalBrand"}</b>
          </div>

          <div className="pd-priceWrap">
            {hasSale && oldPrice > displayPrice && (
              <div className="pd-oldPrice">
                {oldPrice.toLocaleString("vi-VN")}₫
              </div>
            )}
            <div className="pd-price">
              {displayPrice.toLocaleString("vi-VN")}₫
            </div>
          </div>

          {colors.length > 0 && (
            <div className="pd-opt">
              <div className="pd-opt-label">Màu:</div>
              <div className="pd-opt-list">
                {colors.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    className={`pd-chip ${selectedColor === c._id ? "active" : ""}`}
                    onClick={() => {
                      setSelectedColor(c._id);
                      setSelectedSize(null);
                    }}
                    disabled={isInactive}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedColor && sizes.length > 0 && (
            <div className="pd-opt">
              <div className="pd-opt-label">Size:</div>
              <div className="pd-opt-list">
                {sizes.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    className={`pd-chip ${selectedSize === s._id ? "active" : ""}`}
                    onClick={() => setSelectedSize(s._id)}
                    disabled={isInactive}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`pd-stock ${cannotBuy ? "out" : ""}`}>
            {isInactive || isOutOfStock
              ? "Sản phẩm hiện đã hết hàng"
              : variants.length > 0 && selectedVariant
                ? `Còn lại: ${totalStock} sản phẩm`
                : `Tồn kho: ${totalStock} sản phẩm`}
          </div>

          <div className="pd-qtyRow">
            <button
              type="button"
              className="pd-qtyBtn"
              onClick={handleDecQty}
              disabled={cannotBuy}
            >
              -
            </button>

            <input
              className="pd-qtyInput"
              type="number"
              min="1"
              max={totalStock > 0 ? totalStock : undefined}
              value={quantity}
              disabled={cannotBuy}
              onChange={(e) => {
                const v = Number(e.target.value);

                if (!Number.isFinite(v) || v <= 0) {
                  setQuantity(1);
                  return;
                }

                if (totalStock > 0 && v > totalStock) {
                  setQuantity(totalStock);
                  return;
                }

                setQuantity(v);
              }}
            />

            <button
              type="button"
              className="pd-qtyBtn"
              onClick={handleIncQty}
              disabled={cannotBuy}
            >
              +
            </button>
          </div>

          <div className="pd-actions">
            <button
              type="button"
              className="pd-btn pd-buy"
              onClick={handleBuyNow}
              disabled={cannotBuy}
            >
              {isInactive || isOutOfStock ? "Hết hàng" : "Mua ngay"}
            </button>

            <button
              type="button"
              className="pd-btn pd-cart"
              onClick={handleAddToCart}
              disabled={cannotBuy}
            >
              {isInactive || isOutOfStock ? "Không thể thêm" : "Thêm vào giỏ"}
            </button>
          </div>

          <div className="pd-accordion">
            <div className="pd-acc-item">
              <div
                className="pd-acc-header"
                onClick={() =>
                  setOpenSection(openSection === "info" ? null : "info")
                }
              >
                <div className="pd-acc-left">Thông tin sản phẩm</div>
                <span className="pd-acc-arrow">
                  {openSection === "info" ? "⌄" : "›"}
                </span>
              </div>

              {openSection === "info" && (
                <div className="pd-acc-content">
                  <div style={{ whiteSpace: "pre-line" }}>
                    {product.description || "Chưa có thông tin"}
                  </div>
                </div>
              )}
            </div>

            <div className="pd-acc-item">
              <div
                className="pd-acc-header"
                onClick={() =>
                  setOpenSection(openSection === "guide" ? null : "guide")
                }
              >
                <div className="pd-acc-left">Hướng dẫn sử dụng</div>
                <span className="pd-acc-arrow">
                  {openSection === "guide" ? "⌄" : "›"}
                </span>
              </div>

              {openSection === "guide" && (
                <div className="pd-acc-content">
                  <div style={{ whiteSpace: "pre-line" }}>
                    {product.usageGuide || "Chưa có hướng dẫn"}
                  </div>
                </div>
              )}
            </div>

            <div className="pd-acc-item">
              <div
                className="pd-acc-header"
                onClick={() =>
                  setOpenSection(openSection === "feature" ? null : "feature")
                }
              >
                <div className="pd-acc-left">Đặc điểm nổi bật</div>
                <span className="pd-acc-arrow">
                  {openSection === "feature" ? "⌄" : "›"}
                </span>
              </div>

              {openSection === "feature" && (
                <div className="pd-acc-content">
                  <div style={{ whiteSpace: "pre-line" }}>
                    {product.highlights || "Chưa có đặc điểm"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pd-bottom">
        <div className="pd-tabs">
          <button
            type="button"
            className={`pd-tab ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            Đánh giá ({ratingStats.total})
          </button>
        </div>

        <div className="pd-panel">
          <div className="pd-reviewSection">
            <div className="pd-ratingSummary">
              <div className="pd-ratingAvgBox">
                <div className="pd-ratingAvg">{ratingStats.avg}</div>
                <div className="pd-ratingText">Trên 5 điểm</div>
                <div className="pd-ratingCount">
                  {ratingStats.total} đánh giá
                </div>
              </div>

              <div className="pd-ratingBars">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingStats.stats[star];
                  const percent =
                    ratingStats.total === 0
                      ? 0
                      : (count / ratingStats.total) * 100;

                  return (
                    <div key={star} className="pd-ratingRow">
                      <span className="pd-ratingStarLabel">{star}★</span>
                      <div className="pd-bar">
                        <div
                          className="pd-barFill"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="pd-ratingNum">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pd-reviewForm">
              <h3>Viết đánh giá của bạn</h3>

              {shouldOpenReview && !reviewOrderCode && (
                <div className="pd-reviewEmpty" style={{ marginBottom: 12 }}>
                  Vui lòng đi từ đơn hàng đã giao để đánh giá sản phẩm.
                </div>
              )}

              {reviewPermission?.reviewed && (
                <div className="pd-reviewEmpty" style={{ marginBottom: 12 }}>
                  Sản phẩm trong đơn hàng này đã được đánh giá rồi.
                </div>
              )}

              {reviewPermission &&
                reviewPermission.canReview === false &&
                !reviewPermission.reviewed && (
                  <div className="pd-reviewEmpty" style={{ marginBottom: 12 }}>
                    Đơn hàng không hợp lệ để đánh giá sản phẩm này.
                  </div>
                )}

              <div className="pd-starPicker">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`pd-starBtn ${rating >= star ? "active" : ""}`}
                    onClick={() => setRating(star)}
                    disabled={
                      !reviewOrderCode ||
                      reviewPermission?.reviewed ||
                      reviewPermission?.canReview === false
                    }
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                className="pd-reviewInput"
                rows={4}
                placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                value={comment}
                disabled={
                  !reviewOrderCode ||
                  reviewPermission?.reviewed ||
                  reviewPermission?.canReview === false
                }
                onChange={(e) => setComment(e.target.value)}
              />

              <button
                type="button"
                className="pd-submitReview"
                onClick={handleSendReview}
                disabled={
                  !reviewOrderCode ||
                  reviewPermission?.reviewed ||
                  reviewPermission?.canReview === false
                }
              >
                Gửi đánh giá
              </button>
            </div>

            <div className="pd-reviewList">
              {reviews.length === 0 ? (
                <div className="pd-reviewEmpty">
                  Chưa có đánh giá nào cho sản phẩm này.
                </div>
              ) : (
                reviews.map((r) => (
                  <div key={r._id} className="pd-reviewItem">
                    <div className="pd-reviewHead">
                      <b>
                        {r.user?.name ||
                          r.user?.fullName ||
                          r.guestName ||
                          "Ẩn danh"}
                      </b>
                      <div className="pd-reviewStar">
                        {"★".repeat(r.rating || 0)}
                        {"☆".repeat(5 - Number(r.rating || 0))}
                      </div>
                    </div>

                    <p>{r.comment}</p>

                    {r.adminReply && (
                      <div className="pd-adminReply">
                        <b>Shop:</b> {r.adminReply}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pd-related">
        <h2>Sản phẩm liên quan</h2>

        <div className="pd-related-list">
          {filteredRelatedProducts.length === 0 ? (
            <p>Không có sản phẩm liên quan</p>
          ) : (
            filteredRelatedProducts.map((item, index) => {
              const relatedId = getItemId(item);
              const relatedStatus = String(
                item?.status || "ACTIVE",
              ).toUpperCase();
              const canOpen = Boolean(relatedId);
              const relatedSold = Number(
                item?.soldCount ?? item?.sold ?? item?.orderCount ?? 0,
              );
              const relatedStock = getProductStock(item);
              const isRelatedOut =
                relatedStatus === "INACTIVE" || relatedStock <= 0;

              return (
                <div
                  key={relatedId || `related-${index}`}
                  className="pd-related-item"
                  onClick={() => handleOpenRelatedProduct(item)}
                  style={{
                    cursor: canOpen ? "pointer" : "not-allowed",
                    opacity: canOpen ? 1 : 0.65,
                  }}
                >
                  <img
                    src={getRelatedImage(item)}
                    alt={item?.name || "product"}
                  />

                  <div className="pd-related-info">
                    <h4 className="pd-related-name">
                      {item?.name || "Sản phẩm"}
                    </h4>

                    <div className="pd-related-bottom">
                      <span className="pd-related-price">
                        {Number(
                          item?.promotionalPrice || item?.price || 0,
                        ).toLocaleString("vi-VN")}
                        ₫
                      </span>

                      <span className="pd-related-sold">
                        {isRelatedOut
                          ? "Hết hàng"
                          : relatedSold > 0
                            ? `Đã bán ${relatedSold}`
                            : "Mới"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
