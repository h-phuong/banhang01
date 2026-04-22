import { useNavigate } from "react-router-dom";
import "./ProCard.css";

export default function ProCardGrid({ product, onAddToCart }) {
  const navigate = useNavigate();

  const {
    _id,
    name,
    price,
    oldPrice,
    images = [],
    description,
    isNew,
    isSale,
    variants,
    quantity,
    stock,
    inventory,
    status,
  } = product;

  const hasSale = Boolean(isSale) || Number(oldPrice || 0) > Number(price || 0);

  const totalStock =
    Array.isArray(variants) && variants.length > 0
      ? variants.reduce((sum, v) => sum + Number(v?.quantity || 0), 0)
      : Number(quantity ?? stock ?? inventory ?? 0);

  const isInactive = status !== "ACTIVE";
  const isOutOfStock = Number(totalStock || 0) <= 0;
  const showSoldOut = isInactive || isOutOfStock;

  const goDetail = () => {
    if (!_id) return;
    navigate(`/product/${_id}`);
  };

  const handleAddToCart = async (e) => {
  e.stopPropagation();
  if (showSoldOut) return;

  const hasVariants = Array.isArray(variants) && variants.length > 0;
  const variantId = hasVariants && variants.length === 1 ? variants[0]._id : null;

  if (hasVariants && variants.length > 1) {
    navigate(`/product/${_id}`);
    return;
  }

  // SỬA Ở ĐÂY: Đảm bảo truyền đúng key 'productId'
  onAddToCart?.({
    productId: _id, 
    variantId: variantId,
    quantity: 1,
  });
};

  return (
    <div
      className={`procard-grid ${showSoldOut ? "out" : ""}`}
      onClick={goDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") goDetail();
      }}
      style={{ cursor: "pointer" }}
    >
      <div className="procard-img">
        <div className="procard-badges">
          {!showSoldOut && isNew && <span className="badge new">NEW</span>}
          {!showSoldOut && hasSale && <span className="badge sale">SALE</span>}
        </div>

        {showSoldOut && (
          <div className="procard-out-overlay">
            <span className="procard-out-badge">HẾT HÀNG</span>
          </div>
        )}

        <img
  src={images?.[0] || "https://via.placeholder.com/400x400?text=No+Image"}
  alt={name}
/>
      </div>

      <div className="procard-body">
        <h4 className="procard-title">{name}</h4>

        <p className="procard-desc">
          {description ||
            "Chất liệu cao cấp mềm mại, form dáng chuẩn giúp tôn dáng người mặc, dễ dàng phối cùng nhiều phong cách khác nhau từ năng động hằng ngày đến lịch sự khi đi làm hoặc dạo phố."}
        </p>

        <div className="procard-end">
          <div className="procard-priceWrap">
            {hasSale && Number(oldPrice || 0) > Number(price || 0) && (
              <span className="procard-oldPrice">
                {Number(oldPrice || 0).toLocaleString("vi-VN")} ₫
              </span>
            )}

            <span className="procard-price">
              {Number(price || 0).toLocaleString("vi-VN")} ₫
            </span>
          </div>

          <button
            className={`btn-add-cart ${showSoldOut ? "out" : ""}`}
            onClick={handleAddToCart}
            disabled={showSoldOut}
          >
            {showSoldOut ? "Hết hàng" : "Thêm vào giỏ"}
          </button>
        </div>
      </div>
    </div>
  );
}
