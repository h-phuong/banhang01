import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./InventoryPage.css";

const API_BASE = "http://localhost:5000";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Có lỗi xảy ra");
  }

  return data;
}

function pickFirstArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.docs)) return data.docs;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.result)) return data.result;
  if (typeof data === "object") {
    const firstArray = Object.values(data).find((v) => Array.isArray(v));
    return firstArray || [];
  }
  return [];
}

function formatDateTime(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("vi-VN");
}

function getStockStatus(stock, minStock = 5) {
  const qty = Number(stock || 0);
  const min = Number(minStock || 5);

  if (qty <= 0) return { label: "Hết hàng", className: "out" };
  if (qty <= min) return { label: "Sắp hết", className: "low" };
  return { label: "Còn hàng", className: "ok" };
}

function getCategoryName(product) {
  if (typeof product?.categoryId === "object")
    return product.categoryId?.name || "";
  if (typeof product?.category === "object")
    return product.category?.name || "";
  return product?.categoryName || product?.category || "";
}

function getVariantColorName(variant) {
  if (typeof variant?.color === "object") return variant.color?.name || "";
  return variant?.color || "";
}

function getVariantSizeName(variant) {
  if (typeof variant?.size === "object") return variant.size?.name || "";
  return variant?.size || "";
}

function buildCategoryTree(flat) {
  const map = new Map();
  const roots = [];

  (flat || []).forEach((c) => {
    map.set(c._id || c.id, { ...c, children: [] });
  });

  map.forEach((node) => {
    const parentId =
      typeof node.parentId === "object" ? node.parentId?._id : node.parentId;

    if (parentId && map.has(parentId)) {
      map.get(parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortByName = (a, b) => (a.name || "").localeCompare(b.name || "");
  const sortTree = (nodes) => {
    nodes.sort(sortByName);
    nodes.forEach((n) => {
      if (Array.isArray(n.children) && n.children.length > 0) {
        sortTree(n.children);
      }
    });
  };

  sortTree(roots);
  return roots;
}

function flattenCategoryTree(nodes, level = 0) {
  const result = [];

  (nodes || []).forEach((node) => {
    result.push({
      ...node,
      level,
    });

    if (Array.isArray(node.children) && node.children.length > 0) {
      result.push(...flattenCategoryTree(node.children, level + 1));
    }
  });

  return result;
}

function flattenProductsToInventoryRows(products) {
  const rows = [];

  (products || []).forEach((product) => {
    const productId = product?._id || product?.id;
    const productName = product?.name || "";
    const category = getCategoryName(product);
    const categoryId =
      product?.categoryId?._id ||
      product?.categoryId ||
      product?.category?._id ||
      "";
    const updatedAt = product?.updatedAt || product?.createdAt || null;
    const variants = Array.isArray(product?.variants) ? product.variants : [];

    if (!variants.length) {
      rows.push({
        key: `${productId}_default`,
        productId,
        variantId: "",
        name: productName,
        productName,
        sku: product?.sku || "",
        category,
        categoryId,
        color: "",
        size: "",
        stock: Number(product?.quantity || 0),
        minStock: 5,
        updatedAt,
        type: "product",
      });
      return;
    }

    variants.forEach((variant) => {
      const color = getVariantColorName(variant);
      const size = getVariantSizeName(variant);

      rows.push({
        key: `${productId}_${variant?._id || ""}`,
        productId,
        variantId: variant?._id || "",
        name: [productName, color, size].filter(Boolean).join(" - "),
        productName,
        sku: variant?.sku || "",
        category,
        categoryId,
        color,
        size,
        stock: Number(variant?.quantity || 0),
        minStock: 5,
        updatedAt: variant?.updatedAt || updatedAt,
        type: "variant",
      });
    });
  });

  return rows;
}

const initialForm = {
  productId: "",
  variantId: "",
  type: "IN",
  quantity: 1,
  note: "",
};

export default function InventoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusProductId = searchParams.get("productId") || "";

  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [selectedItemKey, setSelectedItemKey] = useState("");
  const [form, setForm] = useState(initialForm);
  const [historyOpen, setHistoryOpen] = useState(true);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await apiFetch(`/api/products?page=1&limit=200`);
      const list = pickFirstArray(res);
      let rows = flattenProductsToInventoryRows(list);

      if (focusProductId) {
        rows = rows.filter(
          (item) => String(item.productId) === String(focusProductId),
        );
      }

      setItems(rows);
      setTotal(rows.length);

      if (focusProductId && rows.length > 0) {
        setSelectedItemKey((prev) => prev || rows[0].key);
      }
    } catch (err) {
      setError(err.message || "Không tải được tồn kho");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");

      const query = focusProductId
        ? `/api/inventory/history?page=1&limit=20&productId=${focusProductId}`
        : "/api/inventory/history?page=1&limit=20";

      const res = await apiFetch(query);
      setHistory(Array.isArray(res.items) ? res.items : []);
    } catch (err) {
      setHistoryError(err.message || "Không tải được lịch sử kho");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [focusProductId]);

  useEffect(() => {
    fetchHistory();
  }, [focusProductId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/api/categories");
        const list = pickFirstArray(res);
        setCategories(list);
      } catch (err) {
        console.error(err);
        setCategories([]);
      }
    })();
  }, []);

  const categoryTree = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  );

  const categoryOptions = useMemo(
    () => flattenCategoryTree(categoryTree),
    [categoryTree],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const keyword = search.trim().toLowerCase();

      const matchKeyword =
        !keyword ||
        String(item.name || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.productName || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.sku || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.category || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.color || "")
          .toLowerCase()
          .includes(keyword) ||
        String(item.size || "")
          .toLowerCase()
          .includes(keyword);

      const matchCategory =
        categoryFilter === "all" ||
        String(item.categoryId || "") === String(categoryFilter);

      const status = getStockStatus(item.stock, item.minStock);
      const matchStatus =
        statusFilter === "all" || status.label === statusFilter;

      const matchLowStock =
        !lowStockOnly || Number(item.stock || 0) <= Number(item.minStock || 5);

      return matchKeyword && matchCategory && matchStatus && matchLowStock;
    });
  }, [items, search, categoryFilter, statusFilter, lowStockOnly]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [filteredItems, page, limit]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / limit));

  const stats = useMemo(() => {
    let totalStock = 0;
    let outCount = 0;
    let lowCount = 0;

    filteredItems.forEach((item) => {
      const stock = Number(item.stock || 0);
      totalStock += stock;

      const status = getStockStatus(stock, item.minStock);
      if (status.label === "Hết hàng") outCount += 1;
      if (status.label === "Sắp hết") lowCount += 1;
    });

    return {
      totalVariants: filteredItems.length,
      totalStock,
      outCount,
      lowCount,
    };
  }, [filteredItems]);

  const selectedItem = useMemo(() => {
    return items.find((item) => item.key === selectedItemKey) || null;
  }, [items, selectedItemKey]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [totalPages, page]);

  useEffect(() => {
    if (!selectedItem) {
      setForm(initialForm);
      return;
    }

    setForm((prev) => ({
      ...prev,
      productId: selectedItem.productId || "",
      variantId: selectedItem.variantId || "",
      type: prev.type || "IN",
      quantity: 1,
      note: "",
    }));
  }, [selectedItem]);

  const handleResetFilter = () => {
    setSearch("");
    setLowStockOnly(false);
    setCategoryFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const handleSelectItem = (item) => {
    setSelectedItemKey(item.key);
    setSubmitError("");
    setSubmitSuccess("");
  };

  const handleSubmitAdjust = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setSubmitError("");
      setSubmitSuccess("");

      if (!form.productId) {
        throw new Error("Vui lòng chọn sản phẩm cần cập nhật kho");
      }

      if (!Number(form.quantity) || Number(form.quantity) <= 0) {
        throw new Error("Số lượng phải lớn hơn 0");
      }

      const payload = {
        productId: form.productId,
        variantId: form.variantId || undefined,
        type: form.type,
        quantity: Number(form.quantity),
        note: form.note.trim(),
      };

      const res = await apiFetch("/api/inventory/adjust", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSubmitSuccess(res.message || "Cập nhật tồn kho thành công");

      await Promise.all([fetchInventory(), fetchHistory()]);

      setForm((prev) => ({
        ...prev,
        quantity: 1,
        note: "",
      }));
    } catch (err) {
      setSubmitError(err.message || "Không thể cập nhật tồn kho");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inventory-page">
      <div className="inventory-head">
        <div>
          <h2 className="inventory-title">Hàng tồn kho</h2>
          <p className="inventory-subtitle">
            Màn hình tồn kho hỗ trợ trực tiếp cho sản phẩm và biến thể, không
            tách nguồn dữ liệu.
          </p>
        </div>
      </div>

      <div className="inventory-stats">
        <div className="inventory-stat-card">
          <span className="inventory-stat-label">Tổng biến thể</span>
          <strong className="inventory-stat-value">
            {stats.totalVariants}
          </strong>
        </div>

        <div className="inventory-stat-card">
          <span className="inventory-stat-label">Tổng tồn kho</span>
          <strong className="inventory-stat-value">{stats.totalStock}</strong>
        </div>

        <div className="inventory-stat-card">
          <span className="inventory-stat-label">Sắp hết hàng</span>
          <strong className="inventory-stat-value">{stats.lowCount}</strong>
        </div>

        <div className="inventory-stat-card">
          <span className="inventory-stat-label">Hết hàng</span>
          <strong className="inventory-stat-value">{stats.outCount}</strong>
        </div>
      </div>

      <div className="inventory-toolbar">
        <div className="inventory-filters">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả danh mục</option>
            {categoryOptions.map((cat) => {
              const id = cat._id || cat.id;
              const prefix =
                cat.level === 0
                  ? ""
                  : `${"\u00A0\u00A0\u00A0".repeat(cat.level)}└─ `;

              return (
                <option key={id} value={id}>
                  {prefix}
                  {cat.name}
                </option>
              );
            })}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Còn hàng">Còn hàng</option>
            <option value="Sắp hết">Sắp hết</option>
            <option value="Hết hàng">Hết hàng</option>
          </select>
        </div>

        <div className="inventory-search">
          <div className="inventory-searchGroup">
            <input
              type="text"
              placeholder="Tìm theo tên, SKU, màu, size, danh mục..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <button type="button" onClick={() => setPage(1)}>
              Tìm
            </button>
          </div>

          <div className="inventory-searchActions">
            <label className="inventory-checkbox">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => {
                  setLowStockOnly(e.target.checked);
                  setPage(1);
                }}
              />
              Chỉ hiện sắp hết hàng
            </label>

            <button
              type="button"
              className="inventory-reset-btn"
              onClick={handleResetFilter}
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="inventory-error">{error}</div> : null}

      <div className="inventory-layout">
        <div className="inventory-table-card">
          <div className="inventory-card-head">
            <h3>Danh sách tồn kho theo sản phẩm</h3>
            <span>
              Tổng: <strong>{filteredItems.length}</strong>
            </span>
          </div>

          {loading ? (
            <div className="inventory-empty">Đang tải dữ liệu tồn kho...</div>
          ) : pagedItems.length === 0 ? (
            <div className="inventory-empty">Không có dữ liệu phù hợp.</div>
          ) : (
            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>SKU</th>
                    <th>Danh mục</th>
                    <th>Màu / Size</th>
                    <th>Tồn</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item) => {
                    const status = getStockStatus(item.stock, item.minStock);
                    const active = item.key === selectedItemKey;

                    return (
                      <tr
                        key={item.key}
                        className={active ? "active" : ""}
                        onClick={() => handleSelectItem(item)}
                      >
                        <td>{item.productName || item.name || "--"}</td>
                        <td>{item.sku || "--"}</td>
                        <td>{item.category || "--"}</td>
                        <td>
                          {[item.color, item.size]
                            .filter(Boolean)
                            .join(" / ") || "--"}
                        </td>
                        <td>{item.stock ?? 0}</td>
                        <td>
                          <span className={`stock-badge ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td>{formatDateTime(item.updatedAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="inventory-row-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/admin/products?edit=${item.productId}`,
                              );
                            }}
                          >
                            Sửa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="inventory-pagination">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>

            <span>
              Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </button>
          </div>
        </div>

        <div className="inventory-side">
          <div className="inventory-form-card">
            <div className="inventory-card-head">
              <h3>Điều chỉnh tồn kho</h3>
            </div>

            {selectedItem ? (
              <div className="inventory-selected">
                <p>
                  <strong>Sản phẩm:</strong> {selectedItem.productName || "--"}
                </p>
                <p>
                  <strong>SKU:</strong> {selectedItem.sku || "--"}
                </p>
                <p>
                  <strong>Biến thể:</strong>{" "}
                  {[selectedItem.color, selectedItem.size]
                    .filter(Boolean)
                    .join(" / ") || "--"}
                </p>
                <p>
                  <strong>Tồn hiện tại:</strong> {selectedItem.stock ?? 0}
                </p>
              </div>
            ) : (
              <div className="inventory-empty">
                Chọn một dòng sản phẩm/biến thể để nhập xuất kho.
              </div>
            )}

            {submitError ? (
              <div className="inventory-error">{submitError}</div>
            ) : null}
            {submitSuccess ? (
              <div className="inventory-success">{submitSuccess}</div>
            ) : null}

            <form className="inventory-form" onSubmit={handleSubmitAdjust}>
              <div className="inventory-form-group">
                <label>Loại thao tác</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                >
                  <option value="IN">Nhập kho</option>
                  <option value="OUT">Xuất kho</option>
                  <option value="ADJUST">Chỉnh tồn</option>
                </select>
              </div>

              <div className="inventory-form-group">
                <label>Số lượng</label>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="inventory-form-group">
                <label>Ghi chú</label>
                <textarea
                  rows="4"
                  placeholder="Nhập lý do điều chỉnh kho..."
                  value={form.note}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                />
              </div>

              <button type="submit" disabled={submitting || !selectedItem}>
                {submitting ? "Đang cập nhật..." : "Xác nhận"}
              </button>
            </form>
          </div>

          <div className="inventory-history-card">
            <div className="inventory-card-head">
              <h3>Lịch sử kho</h3>

              <button
                type="button"
                className={`inventory-collapse-btn ${historyOpen ? "open" : ""}`}
                onClick={() => setHistoryOpen((prev) => !prev)}
                aria-label={
                  historyOpen ? "Thu gọn lịch sử kho" : "Mở rộng lịch sử kho"
                }
                aria-expanded={historyOpen}
              >
                <span className="inventory-collapse-icon">▾</span>
              </button>
            </div>

            {historyOpen && (
              <>
                {historyError ? (
                  <div className="inventory-error">{historyError}</div>
                ) : null}

                {historyLoading ? (
                  <div className="inventory-empty">Đang tải lịch sử...</div>
                ) : history.length === 0 ? (
                  <div className="inventory-empty">
                    Chưa có lịch sử điều chỉnh.
                  </div>
                ) : (
                  <div className="inventory-history-list">
                    {history.map((log) => (
                      <div
                        className="inventory-history-item"
                        key={log._id || `${log.productId}_${log.createdAt}`}
                      >
                        <div className="inventory-history-top">
                          <strong>{log.type || "--"}</strong>
                          <span>{formatDateTime(log.createdAt)}</span>
                        </div>

                        <div className="inventory-history-body">
                          <p>
                            <span>Số lượng:</span> {log.quantity ?? 0}
                          </p>
                          <p>
                            <span>Trước:</span> {log.beforeQty ?? 0}
                          </p>
                          <p>
                            <span>Sau:</span> {log.afterQty ?? 0}
                          </p>
                          <p>
                            <span>Ghi chú:</span> {log.note || "--"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
