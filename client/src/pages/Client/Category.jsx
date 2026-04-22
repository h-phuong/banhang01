import { useEffect, useMemo, useState } from "react";
import ProCardGrid from "../../components/common/ProCard/ProCardGrid.jsx";
import { useCart } from "../../context/CartContext";
import { useLocation } from "react-router-dom";
import "./Category.css";

const API_BASE = "http://localhost:5000";
const DEFAULT_SIZES = ["S", "M", "L", "XL"];

function getMainImage(product) {
  const fixUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_BASE}${url}`; // 🔥 thêm domain
  };

  if (typeof product?.thumbnail === "string" && product.thumbnail.trim()) {
    return fixUrl(product.thumbnail);
  }

  if (Array.isArray(product?.images) && product.images.length > 0) {
    const first = product.images[0];

    if (typeof first === "string") return fixUrl(first);

    if (first?.imageUrl) return fixUrl(first.imageUrl);
  }

  return "https://via.placeholder.com/400x400?text=No+Image";
}

function extractProducts(data) {
  if (!data) return [];

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.docs)) return data.docs;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data?.docs)) return data.data.docs;

  return [];
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function buildCategoryTree(flat) {
  const map = new Map();
  const roots = [];

  (flat || []).forEach((c) => {
    map.set(String(c._id), { ...c, children: [] });
  });

  map.forEach((node) => {
    const parentRaw =
      node.parentId?._id ||
      node.parentId ||
      node.parent?._id ||
      node.parent ||
      null;

    const parentId = parentRaw ? String(parentRaw) : null;

    if (parentId && map.has(parentId)) {
      map.get(parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortByName = (a, b) => (a.name || "").localeCompare(b.name || "");
  roots.sort(sortByName);
  roots.forEach((r) => r.children?.sort(sortByName));

  return roots;
}

function getVariantSizeNames(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const names = variants
    .map((v) => {
      if (typeof v?.size === "object") return v?.size?.name || "";
      return v?.size || "";
    })
    .map((x) =>
      String(x || "")
        .trim()
        .toUpperCase(),
    )
    .filter(Boolean);

  return Array.from(new Set(names));
}

function getVariantColorNames(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const names = variants
    .map((v) => {
      if (typeof v?.color === "object") return v?.color?.name || "";
      return v?.color || "";
    })
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  return Array.from(new Set(names));
}

function getCategoryIdFromProduct(product) {
  const raw =
    product?.categoryId?._id ||
    product?.categoryId ||
    product?.category?._id ||
    product?.category ||
    null;

  return raw ? String(raw) : "";
}

function getAllChildIds(parentId, categories) {
  const target = String(parentId);
  const result = new Set();

  function walk(currentId) {
    result.add(String(currentId));

    categories.forEach((c) => {
      const cParent =
        c?.parentId?._id || c?.parentId || c?.parent?._id || c?.parent || null;

      if (cParent && String(cParent) === String(currentId)) {
        walk(c._id);
      }
    });
  }

  walk(target);
  return Array.from(result);
}

function matchesSearch(product, keyword) {
  if (!keyword) return true;

  const kw = normalizeText(keyword);

  const haystack = [
    product?.name,
    product?.slug,
    product?.description,
    product?.shortDescription,
    product?.sku,
    ...(Array.isArray(product?.tags) ? product.tags : []),
    ...(Array.isArray(product?.variants)
      ? product.variants.flatMap((v) => [
          v?.sku,
          v?.color?.name,
          v?.color,
          v?.size?.name,
          v?.size,
        ])
      : []),
  ]
    .map((x) => normalizeText(x))
    .join(" ");

  return haystack.includes(kw);
}

function CategoryMenuTree({
  categoriesTree,
  selectedId,
  openMap,
  onToggleParent,
  onSelectAll,
  onSelectParent,
  onSelectChild,
}) {
  return (
    <div className="cat-menuList">
      <button
        type="button"
        className={`cat-menuItem ${selectedId === "all" ? "active" : ""}`}
        onClick={onSelectAll}
      >
        <span>Tất Cả Sản Phẩm</span>
      </button>

      {categoriesTree.map((parent) => {
        const hasChildren =
          Array.isArray(parent.children) && parent.children.length > 0;
        const isOpen = !!openMap[parent._id];

        return (
          <div key={parent._id} className="cat-menuGroup">
            <div className="cat-menuRow">
              <button
                type="button"
                className={`cat-menuItem cat-menuItem--parent ${
                  selectedId === parent._id ? "active" : ""
                }`}
                onClick={() => onSelectParent(parent)}
                title={parent.name}
              >
                <span>{parent.name}</span>
              </button>

              {hasChildren && (
                <button
                  type="button"
                  className="cat-menuToggle"
                  onClick={() => onToggleParent(parent._id)}
                  aria-label="toggle"
                  title={isOpen ? "Thu gọn" : "Mở rộng"}
                >
                  <i
                    className={`fas ${
                      isOpen ? "fa-angle-down" : "fa-angle-right"
                    }`}
                  />
                </button>
              )}
            </div>

            {hasChildren && isOpen && (
              <div className="cat-subList">
                {parent.children.map((child) => (
                  <button
                    key={child._id}
                    type="button"
                    className={`cat-subItem ${
                      selectedId === child._id ? "active" : ""
                    }`}
                    onClick={() => onSelectChild(child)}
                    title={child.name}
                  >
                    <span className="cat-subPipe"></span>
                    <span>{child.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Category() {
  const { addToCart } = useCart();
  const location = useLocation();
  const PAGE_SIZE = 6;

  const searchKeyword = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("search") || "").trim();
  }, [location.search]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [includeChildren, setIncludeChildren] = useState(false);
  const [openMap, setOpenMap] = useState({});

  const [allProducts, setAllProducts] = useState([]);
  const [page, setPage] = useState(1);

  const [bestSellers, setBestSellers] = useState([]);

  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sizeSelected, setSizeSelected] = useState([]);
  const [colorSelected, setColorSelected] = useState([]);
  const [colorKeyword, setColorKeyword] = useState("");
  const [onlySale, setOnlySale] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyBestSeller, setOnlyBestSeller] = useState(false);
  const [openStatus, setOpenStatus] = useState(true);
  const [openCategoryMenu, setOpenCategoryMenu] = useState(true);

  const handleToggle = (arr, value, setArr) => {
    setPage(1);
    setArr((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value],
    );
  };

  const handleClearFilter = () => {
    setPriceMin("");
    setPriceMax("");
    setSizeSelected([]);
    setColorSelected([]);
    setColorKeyword("");
    setOnlySale(false);
    setOnlyNew(false);
    setOnlyFeatured(false);
    setOnlyBestSeller(false);
    setPage(1);
  };

  function addColorFromSearch(color) {
    if (!color) return;
    setPage(1);
    setColorSelected((prev) =>
      prev.includes(color) ? prev : [...prev, color],
    );
    setColorKeyword("");
  }

  function removeSelectedColor(color) {
    setPage(1);
    setColorSelected((prev) => prev.filter((x) => x !== color));
  }

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Không lấy được danh mục");
        }

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.docs)
            ? data.docs
            : Array.isArray(data?.data)
              ? data.data
              : [];

        if (!isMounted) return;
        setCategories(list);
      } catch (err) {
        if (!isMounted) return;
        console.log("Fetch categories error:", err);
        setCategories([]);
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        params.set("limit", "1000");
        params.set("page", "1");
        params.set("t", String(Date.now()));

        const res = await fetch(
          `${API_BASE}/api/products?${params.toString()}`,
          {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Không lấy được danh sách sản phẩm");
        }

        const list = extractProducts(data);

        if (!isMounted) return;
        setAllProducts(list);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "Lỗi không xác định");
        setAllProducts([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchBest = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/products/best-sellers?limit=5&t=${Date.now()}`,
          {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          },
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Không lấy được best sellers");
        }

        const list = Array.isArray(data?.docs)
          ? data.docs
          : Array.isArray(data)
            ? data
            : [];

        if (!isMounted) return;
        setBestSellers(list);
      } catch (err) {
        console.log("Fetch best sellers error:", err);
        if (!isMounted) return;
        setBestSellers([]);
      }
    };

    fetchBest();

    return () => {
      isMounted = false;
    };
  }, []);

  const categoriesTree = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  );

  const activeCategoryName = useMemo(() => {
    if (searchKeyword) return `Kết quả tìm kiếm: ${searchKeyword}`;
    if (selectedCategoryId === "all") return "Tất cả Sản Phẩm";
    const found = categories.find(
      (c) => String(c._id) === String(selectedCategoryId),
    );
    return found?.name || "Danh mục";
  }, [searchKeyword, selectedCategoryId, categories]);

  const onToggleParent = (parentId) => {
    setOpenMap((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const onSelectAll = () => {
    setSelectedCategoryId("all");
    setIncludeChildren(false);
    setPage(1);
  };

  const onSelectParent = (parent) => {
    setSelectedCategoryId(parent._id);
    setPage(1);

    const hasChildren =
      Array.isArray(parent.children) && parent.children.length > 0;
    setIncludeChildren(hasChildren);

    if (hasChildren) {
      setOpenMap((prev) => ({ ...prev, [parent._id]: true }));
    }
  };

  const onSelectChild = (child) => {
    setSelectedCategoryId(child._id);
    setIncludeChildren(false);
    setPage(1);
  };

  useEffect(() => {
    setPage(1);

    if (searchKeyword) {
      setSelectedCategoryId("all");
      setIncludeChildren(false);
    }
  }, [searchKeyword]);

  const mappedProducts = useMemo(() => {
    return allProducts.map((p) => ({
      ...p,
      images: [getMainImage(p)],
      price: Number(p?.price || 0),
      isNew: Boolean(p?.isNew),
      isSale: Boolean(
        p?.isSale ||
        Number(p?.oldPrice || 0) > Number(p?.price || 0) ||
        Number(p?.discountPercent || 0) > 0,
      ),
      isFeatured: Boolean(p?.isFeatured),
      isBestSeller: Boolean(p?.isBestSeller),
      sizes: getVariantSizeNames(p),
      colors: getVariantColorNames(p),
      __categoryId: getCategoryIdFromProduct(p),
    }));
  }, [allProducts]);

  const availableSizes = useMemo(() => {
    const set = new Set(DEFAULT_SIZES);

    mappedProducts.forEach((p) => {
      (p.sizes || []).forEach((s) => set.add(String(s).trim().toUpperCase()));
    });

    return Array.from(set);
  }, [mappedProducts]);

  const availableColors = useMemo(() => {
    const set = new Set();

    mappedProducts.forEach((p) => {
      (p.colors || []).forEach((c) => set.add(String(c).trim()));
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [mappedProducts]);

  const searchedColors = useMemo(() => {
    const kw = colorKeyword.trim().toLowerCase();
    if (!kw) return availableColors;

    return availableColors.filter((c) => c.toLowerCase().includes(kw));
  }, [availableColors, colorKeyword]);

  const filteredProducts = useMemo(() => {
    let data = [...mappedProducts];

    if (selectedCategoryId !== "all") {
      const allowedCategoryIds = includeChildren
        ? getAllChildIds(selectedCategoryId, categories)
        : [String(selectedCategoryId)];

      data = data.filter((p) =>
        allowedCategoryIds.includes(String(p.__categoryId || "")),
      );
    }

    if (searchKeyword) {
      data = data.filter((p) => matchesSearch(p, searchKeyword));
    }

    const min = priceMin === "" ? null : Number(priceMin);
    const max = priceMax === "" ? null : Number(priceMax);

    if (min !== null && !Number.isNaN(min)) {
      data = data.filter((p) => p.price >= min);
    }

    if (max !== null && !Number.isNaN(max)) {
      data = data.filter((p) => p.price <= max);
    }

    if (sizeSelected.length > 0) {
      data = data.filter((p) =>
        sizeSelected.some((s) => (p.sizes || []).includes(s)),
      );
    }

    if (colorSelected.length > 0) {
      data = data.filter((p) =>
        colorSelected.some((c) => (p.colors || []).includes(c)),
      );
    }

    if (onlySale) data = data.filter((p) => p.isSale);
    if (onlyNew) data = data.filter((p) => p.isNew);
    if (onlyFeatured) data = data.filter((p) => p.isFeatured);
    if (onlyBestSeller) data = data.filter((p) => p.isBestSeller);

    return data;
  }, [
    mappedProducts,
    selectedCategoryId,
    includeChildren,
    categories,
    searchKeyword,
    priceMin,
    priceMax,
    sizeSelected,
    colorSelected,
    onlySale,
    onlyNew,
    onlyFeatured,
    onlyBestSeller,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );

  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setPage((p) => Math.min(totalPages, p + 1));

  const bestSellerProducts = useMemo(() => {
    return bestSellers.map((p) => ({
      ...p,
      images: [getMainImage(p)],
      price: Number(p?.price || 0),
      isNew: Boolean(p?.isNew),
      isSale: Boolean(
        p?.isSale ||
        Number(p?.oldPrice || 0) > Number(p?.price || 0) ||
        Number(p?.discountPercent || 0) > 0,
      ),
      isFeatured: Boolean(p?.isFeatured),
      isBestSeller: Boolean(p?.isBestSeller),
    }));
  }, [bestSellers]);

  return (
    <div className="cat">
      <div className="cat-layout">
        <aside className="cat-left">
          <div className="cat-box">
            <button
              type="button"
              className="cat-dropHead"
              onClick={() => setOpenCategoryMenu((prev) => !prev)}
            >
              <h4 style={{ margin: 0 }}>Danh Mục</h4>
              <span className="cat-dropArrow">
                <i
                  className={`fas ${
                    openCategoryMenu ? "fa-angle-down" : "fa-angle-right"
                  }`}
                />
              </span>
            </button>

            {openCategoryMenu && (
              <div style={{ marginTop: 12 }}>
                <CategoryMenuTree
                  categoriesTree={categoriesTree}
                  selectedId={selectedCategoryId}
                  openMap={openMap}
                  onToggleParent={onToggleParent}
                  onSelectAll={onSelectAll}
                  onSelectParent={onSelectParent}
                  onSelectChild={onSelectChild}
                />
              </div>
            )}
          </div>

          <div className="cat-box">
            <div className="cat-box__head">
              <h4>Bộ lọc</h4>
              <button
                className="cat-reset"
                onClick={handleClearFilter}
                type="button"
              >
                Reset
              </button>
            </div>

            <div className="cat-block">
              <p className="cat-label">Khoảng giá</p>
              <div className="cat-price">
                <input
                  type="number"
                  placeholder="Từ"
                  value={priceMin}
                  onChange={(e) => {
                    setPriceMin(e.target.value);
                    setPage(1);
                  }}
                />
                <span>—</span>
                <input
                  type="number"
                  placeholder="Đến"
                  value={priceMax}
                  onChange={(e) => {
                    setPriceMax(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="cat-block">
              <p className="cat-label">Size</p>
              <div className="cat-chips">
                {availableSizes.map((s) => (
                  <button
                    key={s}
                    className={`cat-chip ${
                      sizeSelected.includes(s) ? "active" : ""
                    }`}
                    onClick={() =>
                      handleToggle(sizeSelected, s, setSizeSelected)
                    }
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="cat-block">
              <p className="cat-label">Màu Sắc</p>

              <div className="cat-colorSearchBox">
                <input
                  type="text"
                  className="cat-colorSearchInput"
                  placeholder="Nhập màu: Đen"
                  value={colorKeyword}
                  onChange={(e) => setColorKeyword(e.target.value)}
                />

                <button
                  type="button"
                  className="cat-colorSearchBtn"
                  onClick={() => {
                    const firstMatch = searchedColors.find(
                      (c) => !colorSelected.includes(c),
                    );
                    if (firstMatch) addColorFromSearch(firstMatch);
                  }}
                >
                  <i className="fas fa-search" />
                </button>
              </div>

              {!!colorKeyword.trim() && searchedColors.length > 0 && (
                <div className="cat-colorSuggest">
                  {searchedColors
                    .filter((c) => !colorSelected.includes(c))
                    .slice(0, 8)
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="cat-colorSuggestItem"
                        onClick={() => addColorFromSearch(c)}
                      >
                        {c}
                      </button>
                    ))}
                </div>
              )}

              {colorSelected.length > 0 && (
                <div className="cat-colorSelected">
                  {colorSelected.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="cat-colorSelectedTag"
                      onClick={() => removeSelectedColor(c)}
                    >
                      <span>{c}</span>
                      <span className="cat-colorSelectedX">×</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="cat-block">
              <button
                type="button"
                className="cat-dropHead"
                onClick={() => setOpenStatus((prev) => !prev)}
              >
                <span className="cat-label" style={{ marginBottom: 0 }}>
                  Tình trạng
                </span>
                <span className="cat-dropArrow">
                  <i
                    className={`fas ${
                      openStatus ? "fa-angle-down" : "fa-angle-right"
                    }`}
                  />
                </span>
              </button>

              {openStatus && (
                <div className="cat-dropBody">
                  <label className="cat-check">
                    <input
                      type="checkbox"
                      checked={onlySale}
                      onChange={(e) => {
                        setOnlySale(e.target.checked);
                        setPage(1);
                      }}
                    />
                    <span>Giảm giá</span>
                  </label>

                  <label className="cat-check">
                    <input
                      type="checkbox"
                      checked={onlyNew}
                      onChange={(e) => {
                        setOnlyNew(e.target.checked);
                        setPage(1);
                      }}
                    />
                    <span>Mới</span>
                  </label>

                  <label className="cat-check">
                    <input
                      type="checkbox"
                      checked={onlyFeatured}
                      onChange={(e) => {
                        setOnlyFeatured(e.target.checked);
                        setPage(1);
                      }}
                    />
                    <span>Nổi bật</span>
                  </label>

                  <label className="cat-check">
                    <input
                      type="checkbox"
                      checked={onlyBestSeller}
                      onChange={(e) => {
                        setOnlyBestSeller(e.target.checked);
                        setPage(1);
                      }}
                    />
                    <span>Bán chạy</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="cat-right">
          <div className="heading cat-title">
            <h3>{activeCategoryName}</h3>
          </div>

          {loading ? (
            <div className="cat-loading">Loading...</div>
          ) : error ? (
            <div className="cat-empty">
              <h4>Lỗi</h4>
              <p>{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="cat-empty">
              <h4>Không có sản phẩm</h4>
              <p>Hãy thử bỏ bớt bộ lọc hoặc chọn danh mục khác.</p>
              <button onClick={handleClearFilter} type="button">
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="cat-grid">
                {paginatedProducts.map((item) => (
                  <ProCardGrid
                    key={item._id}
                    product={item}
                    onAddToCart={addToCart}
                  />
                ))}
              </div>

              <div className="cat-pagination">
                <button
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  type="button"
                >
                  Trước
                </button>
                <span>
                  Trang {page} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={page === totalPages}
                  type="button"
                >
                  Sau
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="cat-bestFull">
        <div className="heading">
          <h3>Sản phẩm bán chạy nhất</h3>
        </div>

        <div className="best-grid">
          {bestSellerProducts.length === 0 ? (
            <div style={{ padding: 12 }}>Chưa có dữ liệu bán chạy.</div>
          ) : (
            bestSellerProducts.map((item) => (
              <ProCardGrid
                key={item._id}
                product={item}
                onAddToCart={addToCart}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
