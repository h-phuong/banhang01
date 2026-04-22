import { useState } from "react";
import "./ProductFilter.css";

const ProductFilter = ({ onFilter }) => {
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [priceRange, setPriceRange] = useState("");

  const handleFilter = () => {
    onFilter({
      category,
      size,
      color,
      priceRange,
    });
  };

  const clearFilter = () => {
    setCategory("");
    setSize("");
    setColor("");
    setPriceRange("");
    onFilter({});
  };

  return (
    <div className="filter-container">
      <h3>Bộ lọc sản phẩm</h3>

      {/* CATEGORY */}
      <div className="filter-group">
        <label>Danh mục</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="ao">Áo</option>
          <option value="quan">Quần</option>
        </select>
      </div>

      {/* SIZE */}
      <div className="filter-group">
        <label>Size</label>
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
        </select>
      </div>

      {/* COLOR */}
      <div className="filter-group">
        <label>Màu</label>
        <select value={color} onChange={(e) => setColor(e.target.value)}>
          <option value="">Tất cả</option>
          <option value="Đen">Đen</option>
          <option value="Trắng">Trắng</option>
          <option value="Xanh">Xanh</option>
        </select>
      </div>

      {/* PRICE */}
      <div className="filter-group">
        <label>Giá</label>
        <select
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
        >
          <option value="">Tất cả</option>
          <option value="0-200000">Dưới 200k</option>
          <option value="200000-500000">200k - 500k</option>
          <option value="500000-1000000">500k - 1 triệu</option>
        </select>
      </div>

      <div className="filter-actions">
        <button onClick={handleFilter}>Lọc</button>
        <button className="clear-btn" onClick={clearFilter}>
          Xóa bộ lọc
        </button>
      </div>
    </div>
  );
};

export default ProductFilter;
