import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import productService from "../../services/productService";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import "./ProductsPage.css";

const API_BASE = "http://localhost:5000";

const emptyForm = {
  _id: "",
  name: "",
  categoryId: "",
  colors: [],
  sizes: [],
  quantity: "",
  description: "",
  usageGuide: "",
  highlights: "",
  price: "",
  oldPrice: "",
  status: "ACTIVE",
  isNew: false,
  isFeatured: false,
  isBestSeller: false,
  images: [],
  imageFiles: [],
};

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

function getCategoryPath(categoryId, categoryMap) {
  const current = categoryMap.get(categoryId);
  if (!current) return "";

  const names = [];
  let cursor = current;

  while (cursor) {
    names.unshift(cursor.name || "");
    const parentId =
      typeof cursor.parentId === "object"
        ? cursor.parentId?._id
        : cursor.parentId;

    if (!parentId) break;
    cursor = categoryMap.get(parentId);
  }

  return names.filter(Boolean).join(" / ");
}

function getDescendantIds(parentId, categoryMap) {
  const result = [];
  const parentKey = String(parentId);

  categoryMap.forEach((value, key) => {
    const pid =
      typeof value.parentId === "object" ? value.parentId?._id : value.parentId;

    if (String(pid || "") === parentKey) {
      result.push(String(key));
      result.push(...getDescendantIds(key, categoryMap));
    }
  });

  return result;
}

function normalizeProduct(p, categoryMap = new Map()) {
  const variants = Array.isArray(p?.variants) ? p.variants : [];
  const variantCount = variants.length;

  const totalQty = variantCount
    ? variants.reduce((s, v) => s + Number(v.quantity || 0), 0)
    : Number(p?.quantity ?? p?.stock ?? p?.inventory ?? 0);

  const categoryId =
    p?.categoryId?._id ||
    p?.categoryId ||
    p?.category?._id ||
    p?.category ||
    "";

  const categoryObj =
    typeof p?.categoryId === "object"
      ? p.categoryId
      : typeof p?.category === "object"
        ? p.category
        : null;

  const categoryName =
    categoryObj?.name ||
    p?.categoryName ||
    (typeof p?.category === "string" ? p.category : "");

  const categoryPath = categoryId
    ? getCategoryPath(categoryId, categoryMap)
    : categoryName;

  const galleryImages = Array.isArray(p?.images) ? p.images : [];
  const firstGalleryImage = galleryImages.find(Boolean);
  const imageUrl =
    p?.thumbnail ||
    (typeof firstGalleryImage === "string"
      ? firstGalleryImage
      : firstGalleryImage?.imageUrl) ||
    "";

  return {
    _id: p?._id || p?.id,
    name: p?.name ?? "",
    category: categoryName,
    categoryId,
    categoryPath,
    price: Number(p?.price ?? 0),
    oldPrice: Number(p?.oldPrice ?? 0),
    status: p?.status ?? "ACTIVE",
    isNew: Boolean(p?.isNew),
    isFeatured: Boolean(p?.isFeatured),
    isBestSeller: Boolean(p?.isBestSeller),
    variantCount,
    quantity: Number(totalQty || 0),
    imageUrl,
    createdAt: p?.createdAt || "",
  };
}

async function uploadOneImage(file) {
  try {
    const result = await uploadToCloudinary(file);

    try {
      const saveRes = await fetch(`${API_BASE}/api/upload/cloud`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: result.url,
          publicId: result.publicId,
          originalName: file.name,
          size: result.size,
          mimeType: file.type,
        }),
      });

      if (saveRes.ok) {
        const saved = await saveRes.json();
        const it = saved.data || saved;
        return it.imagePath || result.url;
      }

      console.warn("SAVE CLOUD IMAGE FAILED:", saveRes.status);
      return result.url;
    } catch (e) {
      console.warn("Failed to save cloud image on server:", e);
      return result.url;
    }
  } catch (e) {
    console.error("CLOUDINARY UPLOAD FAILED, fallback to local upload:", e);

    const upFd = new FormData();
    upFd.append("image", file);

    const upRes = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: upFd,
    });

    const upData = await upRes.json().catch(() => null);
    if (!upRes.ok) {
      throw new Error(upData?.message || "Upload failed");
    }

    return upData.imagePath;
  }
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editProductId = searchParams.get("edit") || "";

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [searchCategoryId, setSearchCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [categories, setCategories] = useState([]);
  const [colorInput, setColorInput] = useState("");
  const [sizeInput, setSizeInput] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [storageImages, setStorageImages] = useState([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageSelected, setStorageSelected] = useState([]);

  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => {
      map.set(c._id || c.id, c);
    });
    return map;
  }, [categories]);

  const categoryTree = useMemo(
    () => buildCategoryTree(categories),
    [categories],
  );

  const categoryOptions = useMemo(
    () => flattenCategoryTree(categoryTree),
    [categoryTree],
  );

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  async function load(targetPage = page) {
    setLoading(true);
    setErr("");

    try {
      const keyword = search.trim();

      const res = await productService.getAll({
        search: keyword,
        q: keyword,
        page: 1,
        limit: 100000,
      });

      const data = res?.data ?? res;
      const list = pickFirstArray(data);

      let items = list.map((p) => normalizeProduct(p, categoryMap));

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        items = items.filter((item) => {
          const name = String(item.name || "").toLowerCase();
          const category = String(item.category || "").toLowerCase();
          const categoryPath = String(item.categoryPath || "").toLowerCase();

          return (
            name.includes(lowerKeyword) ||
            category.includes(lowerKeyword) ||
            categoryPath.includes(lowerKeyword)
          );
        });
      }

      if (searchCategoryId) {
        const allowedIds = new Set([
          String(searchCategoryId),
          ...getDescendantIds(searchCategoryId, categoryMap),
        ]);

        items = items.filter((item) =>
          allowedIds.has(String(item.categoryId || "")),
        );
      }

      items.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );

      const totalItems = items.length;
      const currentPage = Math.max(1, Number(targetPage || 1));
      const start = (currentPage - 1) * limit;
      const pagedItems = items.slice(start, start + limit);

      setRows(pagedItems);
      setTotal(totalItems);
    } catch (e) {
      console.error("LOAD PRODUCTS ERROR:", e);
      setErr(e?.response?.data?.message || e.message || "Load products failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, searchCategoryId, categoryMap]);

  useEffect(() => {
    setPage(1);
  }, [search, searchCategoryId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data?.items || data?.data || data?.docs || [];
        setCategories(list);
      } catch (e) {
        console.error("LOAD CATEGORIES ERROR:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!editProductId || rows.length === 0 || open || saving) return;

    const found = rows.find(
      (item) => String(item._id) === String(editProductId),
    );
    if (!found) return;

    openEdit(found).finally(() => {
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProductId, rows, open, saving]);

  function openCreate() {
    setMode("create");
    setForm(emptyForm);
    setColorInput("");
    setSizeInput("");
    setErr("");
    setOpen(true);
  }

  function addColor() {
    const v = colorInput.trim();
    if (!v) return;
    setForm((f) => ({
      ...f,
      colors: Array.from(new Set([...(f.colors || []), v])),
    }));
    setColorInput("");
  }

  function removeColor(v) {
    setForm((f) => ({
      ...f,
      colors: (f.colors || []).filter((x) => x !== v),
    }));
  }

  function addSize() {
    const v = sizeInput.trim().toUpperCase();
    if (!v) return;
    setForm((f) => ({
      ...f,
      sizes: Array.from(new Set([...(f.sizes || []), v])),
    }));
    setSizeInput("");
  }

  function removeSize(v) {
    setForm((f) => ({
      ...f,
      sizes: (f.sizes || []).filter((x) => x !== v),
    }));
  }

  async function openStorage() {
    setStorageSelected([]);
    setStorageImages([]);
    setStorageLoading(true);
    setStorageModalOpen(true);

    try {
      const res = await fetch(`${API_BASE}/api/upload`);
      if (!res.ok) throw new Error("Load storage failed");
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data : data.data || [];
      const images = (list || []).map(
        (it) => it.url || it.imagePath || it.path || it,
      );
      setStorageImages(images.filter(Boolean));
    } catch (e) {
      console.error("LOAD STORAGE ERROR:", e);
      setStorageImages([]);
    } finally {
      setStorageLoading(false);
    }
  }

  function toggleStorageSelect(url) {
    setStorageSelected((s) => {
      if (s.includes(url)) return s.filter((x) => x !== url);
      return [...s, url];
    });
  }

  function confirmStorageSelection() {
    if (!storageSelected || storageSelected.length === 0) {
      setStorageModalOpen(false);
      return;
    }

    setForm((f) => {
      const existing = Array.isArray(f.images) ? f.images : [];
      const existingUrls = new Set(existing.map((img) => img.url));

      const added = storageSelected
        .filter((url) => !existingUrls.has(url))
        .map((url, index) => ({
          url,
          isPrimary: existing.length === 0 && index === 0,
        }));

      const merged = [...existing, ...added];

      if (merged.length > 0 && !merged.some((img) => img.isPrimary)) {
        merged[0] = { ...merged[0], isPrimary: true };
      }

      return { ...f, images: merged };
    });

    setStorageModalOpen(false);
  }

  function setPrimaryImage(url) {
    setForm((f) => ({
      ...f,
      images: (f.images || []).map((img) => ({
        ...img,
        isPrimary: img.url === url,
      })),
    }));
  }

  function removeImage(url) {
    setForm((f) => {
      const next = (f.images || []).filter((img) => img.url !== url);

      if (next.length > 0 && !next.some((img) => img.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }

      return { ...f, images: next };
    });
  }

  async function openEdit(p) {
    try {
      setErr("");
      setMode("edit");
      setSaving(true);

      const res = await productService.getById(p._id);
      const d = res?.data ?? res;

      const variants = Array.isArray(d?.variants) ? d.variants : [];

      const totalQty = variants.length
        ? variants.reduce((s, v) => s + Number(v.quantity || 0), 0)
        : Number(d?.quantity ?? 0);

      const colorsFromVariants = Array.from(
        new Set(
          variants
            .map((v) =>
              typeof v?.color === "object" ? v?.color?.name : v?.color,
            )
            .filter(Boolean),
        ),
      );

      const sizesFromVariants = Array.from(
        new Set(
          variants
            .map((v) => (typeof v?.size === "object" ? v?.size?.name : v?.size))
            .filter(Boolean),
        ),
      );

      const existingGallery = Array.isArray(d?.images)
        ? d.images
            .map((img) => ({
              url: typeof img === "string" ? img : img?.imageUrl || "",
              isPrimary: false,
            }))
            .filter((img) => img.url)
        : [];

      const allImages = [
        ...(d.thumbnail ? [{ url: d.thumbnail, isPrimary: true }] : []),
        ...existingGallery.filter((img) => img.url !== d.thumbnail),
      ];

      if (allImages.length > 0 && !allImages.some((img) => img.isPrimary)) {
        allImages[0] = { ...allImages[0], isPrimary: true };
      }

      setForm({
        ...emptyForm,
        _id: d._id,
        name: d.name ?? "",
        categoryId: d?.categoryId?._id || d?.categoryId || "",
        price: String(d.price ?? ""),
        oldPrice: String(d.oldPrice ?? ""),
        status: d.status || "ACTIVE",
        quantity: String(totalQty ?? 0),
        description: d.description || "",
        usageGuide: d.usageGuide || "",
        highlights: d.highlights || "",
        colors: colorsFromVariants,
        sizes: sizesFromVariants,
        isNew: Boolean(d.isNew),
        isFeatured: Boolean(d.isFeatured),
        isBestSeller: Boolean(d.isBestSeller),
        images: allImages,
        imageFiles: [],
      });

      setColorInput("");
      setSizeInput("");
      setOpen(true);
    } catch (e) {
      console.error("OPEN EDIT ERROR:", e);
      setErr(e?.response?.data?.message || e.message || "Open edit failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setErr("");

    try {
      if (!form.name.trim()) {
        throw new Error("Vui lòng nhập tên sản phẩm");
      }

      if (!form.categoryId) {
        throw new Error("Vui lòng chọn danh mục");
      }

      if (Number(form.price || 0) < 0) {
        throw new Error("Giá bán không hợp lệ");
      }

      if (Number(form.oldPrice || 0) < 0) {
        throw new Error("Giá gốc không hợp lệ");
      }

      if (Number(form.quantity || 0) < 0) {
        throw new Error("Tổng tồn không hợp lệ");
      }

      let finalImages = [...(form.images || [])];

      if (Array.isArray(form.imageFiles) && form.imageFiles.length > 0) {
        for (const file of form.imageFiles) {
          try {
            const url = await uploadOneImage(file);
            finalImages.push({
              url,
              isPrimary: finalImages.length === 0,
            });
          } catch (uploadError) {
            console.error("UPLOAD IMAGE ERROR:", file?.name, uploadError);
            throw new Error(
              `Upload ảnh thất bại${file?.name ? `: ${file.name}` : ""}`,
            );
          }
        }
      }

      if (finalImages.length > 0 && !finalImages.some((img) => img.isPrimary)) {
        finalImages[0] = { ...finalImages[0], isPrimary: true };
      }

      const primaryImage = finalImages.find((img) => img.isPrimary)?.url || "";
      const secondaryImages = finalImages.filter(
        (img) => img.url !== primaryImage,
      );

      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        status: form.status,
        price: Number(form.price || 0),
        oldPrice: Number(form.oldPrice || 0),
        quantity: Number(form.quantity || 0),
        description: form.description || "",
        usageGuide: form.usageGuide || "",
        highlights: form.highlights || "",
        colors: form.colors || [],
        sizes: form.sizes || [],
        isNew: Boolean(form.isNew),
        isFeatured: Boolean(form.isFeatured),
        isBestSeller: Boolean(form.isBestSeller),
        thumbnail: primaryImage,
        images: secondaryImages.map((img, index) => ({
          imageUrl: img.url,
          sortOrder: index,
        })),
      };

      console.log("SAVE PRODUCT PAYLOAD:", payload);

      if (mode === "create") {
        await productService.create(payload);
        setOpen(false);
        setForm(emptyForm);
        setPage(1);
        await load(1);
      } else {
        const res = await productService.update(form._id, payload);
        const updatedRaw = res?.data ?? res;
        const updatedItem = normalizeProduct(updatedRaw, categoryMap);

        setRows((prev) =>
          prev.map((item) =>
            String(item._id) === String(form._id) ? updatedItem : item,
          ),
        );

        setOpen(false);
        setForm(emptyForm);
        await load(page);
      }
    } catch (e2) {
      console.error("SAVE PRODUCT ERROR:", e2);
      setErr(e2?.response?.data?.message || e2.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function openInventory(p) {
    navigate(`/admin/inventory?productId=${p._id}`);
  }

  return (
    <div className="ap-page">
      <div className="ap-head">
        <div>
          <h2 className="ap-title">Sản phẩm</h2>
          <p className="ap-subtitle">
            Quản lý thông tin sản phẩm, biến thể và điều hướng sang tồn kho.
          </p>
        </div>

        <div className="ap-actions">
          <button className="ap-btn ap-btnPrimary" onClick={openCreate}>
            + Thêm sản phẩm
          </button>
        </div>
      </div>

      <div className="ap-toolbar">
        <div className="ap-field">
          <span className="ap-label">Tìm kiếm</span>
          <input
            className="ap-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nhập tên sản phẩm..."
          />
        </div>

        <div className="ap-field">
          <span className="ap-label">Danh mục</span>
          <select
            className="ap-input"
            value={searchCategoryId}
            onChange={(e) => setSearchCategoryId(e.target.value)}
          >
            <option value="">-- Tất cả danh mục --</option>
            {categoryOptions.map((c) => {
              const id = c._id || c.id;
              const prefix =
                c.level === 0
                  ? ""
                  : `${"\u00A0\u00A0\u00A0".repeat(c.level)}└─ `;
              return (
                <option key={id} value={id}>
                  {prefix}
                  {c.name}
                </option>
              );
            })}
          </select>
        </div>

        <div className="ap-field ap-fieldRight">
          <span className="ap-badge ap-badgeInfo">Tổng: {total}</span>
        </div>
      </div>

      {err && <div className="ap-alert">{err}</div>}

      <div className="ap-card">
        <div className="ap-tableWrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th>Hình ảnh</th>
                <th>Tên</th>
                <th>Biến thể</th>
                <th>Danh mục</th>
                <th className="ap-right">Giá</th>
                <th>Trạng thái</th>
                <th className="ap-right">Tồn</th>
                <th className="ap-right">Hành động</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="ap-muted ap-center">
                    Đang tải...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="ap-muted ap-center">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{
                            width: 56,
                            height: 56,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 8,
                            border: "1px dashed #d1d5db",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            color: "#9ca3af",
                          }}
                        >
                          No img
                        </div>
                      )}
                    </td>

                    <td className="ap-strong">
                      <div>{p.name}</div>

                      <div className="ap-productBadges">
                        {p.isNew && (
                          <span className="ap-badge ap-badgeInfo">Mới</span>
                        )}
                        {p.isFeatured && (
                          <span className="ap-badge ap-badgeInfo">Nổi bật</span>
                        )}
                        {p.isBestSeller && (
                          <span className="ap-badge ap-badgeWarning">
                            Bán chạy
                          </span>
                        )}
                        {Number(p.oldPrice || 0) > Number(p.price || 0) && (
                          <span className="ap-badge ap-badgeDanger">
                            Giảm giá
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="ap-mono">{p.variantCount}</td>
                    <td>{p.categoryPath || p.category || "-"}</td>
                    <td className="ap-right">
                      {Number(p.price || 0).toLocaleString("vi-VN")}
                    </td>
                    <td>
                      {Number(p.quantity || 0) <= 0 ? (
                        <span className="ap-badge ap-badgeMuted">Hết hàng</span>
                      ) : p.status === "ACTIVE" ? (
                        <span className="ap-badge ap-badgeSuccess">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="ap-badge ap-badgeMuted">Khóa</span>
                      )}
                    </td>
                    <td className="ap-right">{Number(p.quantity || 0)}</td>
                    <td className="ap-right">
                      <div className="ap-actionGroup">
                        <button
                          className="ap-btn ap-btnInventory"
                          onClick={() => openInventory(p)}
                          disabled={saving}
                        >
                          Kho
                        </button>

                        <button
                          className="ap-btn ap-btnEdit"
                          onClick={() => openEdit(p)}
                          disabled={saving}
                        >
                          Sửa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ap-pagination">
          <button
            className="ap-btn ap-btnGhost"
            disabled={page <= 1 || loading}
            onClick={() => setPage((x) => Math.max(1, x - 1))}
          >
            ← Trước
          </button>
          <span className="ap-muted">
            Trang <b>{page}</b> / {pageCount}
          </span>
          <button
            className="ap-btn ap-btnGhost"
            disabled={page >= pageCount || loading}
            onClick={() => setPage((x) => Math.min(pageCount, x + 1))}
          >
            Sau →
          </button>
        </div>
      </div>

      {open && (
        <div
          className="ap-modalBackdrop"
          onMouseDown={() => !saving && setOpen(false)}
        >
          <div className="ap-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ap-modalHead">
              <h3 className="ap-modalTitle">
                {mode === "create" ? "Thêm sản phẩm" : "Sửa sản phẩm"}
              </h3>
              <button
                type="button"
                className="ap-btn ap-btnGhost"
                onClick={() => !saving && setOpen(false)}
              >
                ×
              </button>
            </div>

            <form className="ap-form" onSubmit={onSubmit}>
              <div className="ap-grid">
                <div className="ap-field ap-fieldHalf">
                  <span className="ap-label">Tên sản phẩm</span>
                  <input
                    className="ap-input"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="ap-field ap-fieldHalf">
                  <span className="ap-label">Danh mục</span>
                  <select
                    className="ap-input"
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, categoryId: e.target.value }))
                    }
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categoryOptions.map((c) => {
                      const id = c._id || c.id;
                      const prefix =
                        c.level === 0
                          ? ""
                          : `${"\u00A0\u00A0\u00A0".repeat(c.level)}└─ `;
                      return (
                        <option key={id} value={id}>
                          {prefix}
                          {c.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="ap-field ap-fieldHalf">
                  <span className="ap-label">Giá bán</span>
                  <input
                    className="ap-input"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="ap-field ap-fieldHalf">
                  <span className="ap-label">Giá gốc</span>
                  <input
                    className="ap-input"
                    type="number"
                    min="0"
                    value={form.oldPrice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, oldPrice: e.target.value }))
                    }
                    placeholder="Để trống nếu không giảm giá"
                  />
                </div>

                <div className="ap-field ap-fieldHalf">
                  <span className="ap-label">Tổng tồn</span>
                  <input
                    className="ap-input"
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="ap-field ap-fieldHalf">
                  <span className="ap-label">Trạng thái</span>
                  <select
                    className="ap-input"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    <option value="ACTIVE">Đang Bán</option>
                    <option value="INACTIVE">Ngừng Bán</option>
                  </select>
                </div>

                <div className="ap-field ap-fieldHalf">
                  <span className="ap-label">Màu sắc</span>
                  <div className="ap-inlineRow">
                    <input
                      className="ap-input"
                      placeholder="Nhập màu rồi bấm Thêm"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addColor())
                      }
                    />
                    <button
                      type="button"
                      className="ap-btn ap-btnGhost"
                      onClick={addColor}
                    >
                      Thêm
                    </button>
                  </div>

                  <div className="ap-chipWrap">
                    {(form.colors || []).map((v) => (
                      <span key={v} className="ap-chip">
                        {v}
                        <button
                          type="button"
                          className="ap-chipX"
                          onClick={() => removeColor(v)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="ap-field ap-fieldHalf">
                  <span className="ap-label">Kích thước</span>
                  <div className="ap-inlineRow">
                    <input
                      className="ap-input"
                      placeholder="Nhập size rồi bấm Thêm"
                      value={sizeInput}
                      onChange={(e) => setSizeInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addSize())
                      }
                    />
                    <button
                      type="button"
                      className="ap-btn ap-btnGhost"
                      onClick={addSize}
                    >
                      Thêm
                    </button>
                  </div>

                  <div className="ap-chipWrap">
                    {(form.sizes || []).map((v) => (
                      <span key={v} className="ap-chip">
                        {v}
                        <button
                          type="button"
                          className="ap-chipX"
                          onClick={() => removeSize(v)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="ap-field ap-fieldFull">
                  <span className="ap-label">Hình ảnh sản phẩm</span>

                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      className="ap-file"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          imageFiles: Array.from(e.target.files || []),
                        }))
                      }
                    />

                    <button
                      type="button"
                      className="ap-btn ap-btnGhost ap-btnStorage"
                      onClick={openStorage}
                    >
                      Chọn từ kho
                    </button>
                  </div>

                  {Array.isArray(form.imageFiles) &&
                    form.imageFiles.length > 0 && (
                      <div className="ap-fileHint" style={{ marginTop: 8 }}>
                        Đã chọn mới:{" "}
                        <b>{form.imageFiles.map((f) => f.name).join(", ")}</b>
                      </div>
                    )}

                  {Array.isArray(form.images) && form.images.length > 0 && (
                    <div className="ap-galleryPreview">
                      {form.images.map((img, index) => (
                        <div
                          key={`${img.url}-${index}`}
                          className="ap-galleryItem"
                          style={{ position: "relative" }}
                        >
                          <img src={img.url} alt={`product-${index}`} />

                          <div
                            style={{
                              position: "absolute",
                              left: 6,
                              bottom: 6,
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              className="ap-btn ap-btnGhost"
                              onClick={() => setPrimaryImage(img.url)}
                              style={{
                                padding: "4px 8px",
                                fontSize: 12,
                                background: img.isPrimary ? "#244656" : "",
                                color: img.isPrimary ? "#fff" : "",
                              }}
                            >
                              {img.isPrimary ? "Ảnh chính" : "Đặt ảnh chính"}
                            </button>
                          </div>

                          <button
                            type="button"
                            className="ap-galleryRemove"
                            onClick={() => removeImage(img.url)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {storageModalOpen && (
                  <div
                    className="ap-modalBackdrop"
                    onMouseDown={() => setStorageModalOpen(false)}
                  >
                    <div
                      className="ap-modal ap-storageModal"
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ maxWidth: 900 }}
                    >
                      <div className="ap-modalHead">
                        <h3 className="ap-modalTitle">Chọn ảnh từ kho</h3>
                        <button
                          type="button"
                          className="ap-btn ap-btnGhost"
                          onClick={() => setStorageModalOpen(false)}
                        >
                          ×
                        </button>
                      </div>

                      <div className="ap-storageBody">
                        {storageLoading ? (
                          <div className="ap-muted">Đang tải kho ảnh...</div>
                        ) : storageImages.length === 0 ? (
                          <div className="ap-muted">
                            Không có ảnh trong kho.
                          </div>
                        ) : (
                          <div className="ap-storageGrid">
                            {storageImages.map((url) => (
                              <div
                                key={url}
                                className={`ap-storageItem ${
                                  storageSelected.includes(url)
                                    ? "is-selected"
                                    : ""
                                }`}
                              >
                                <img
                                  src={url}
                                  alt="storage"
                                  className="ap-storageImage"
                                />

                                <button
                                  type="button"
                                  className="ap-storagePickBtn"
                                  onClick={() => toggleStorageSelect(url)}
                                >
                                  {storageSelected.includes(url) ? "✓" : "+"}
                                </button>

                                <div className="ap-storageName">
                                  {url.split("/").slice(-1)[0]}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="ap-storageFooter">
                        <button
                          type="button"
                          className="ap-btn ap-btnGhost"
                          onClick={() => setStorageModalOpen(false)}
                        >
                          Huỷ
                        </button>
                        <button
                          type="button"
                          className="ap-btn ap-btnPrimary"
                          onClick={confirmStorageSelection}
                        >
                          Chọn ({storageSelected.length})
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="ap-field ap-fieldHalf">
                  <span className="ap-label">Nhãn sản phẩm</span>
                  <div className="ap-labelChecks">
                    <label className="ap-check">
                      <input
                        type="checkbox"
                        checked={form.isNew}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, isNew: e.target.checked }))
                        }
                      />
                      <span>Mới</span>
                    </label>

                    <label className="ap-check">
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            isFeatured: e.target.checked,
                          }))
                        }
                      />
                      <span>Nổi bật</span>
                    </label>

                    <label className="ap-check">
                      <input
                        type="checkbox"
                        checked={form.isBestSeller}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            isBestSeller: e.target.checked,
                          }))
                        }
                      />
                      <span>Bán chạy</span>
                    </label>
                  </div>
                </div>

                <div className="ap-field ap-fieldHalf">
                  <span className="ap-label">Mô tả</span>
                  <textarea
                    className="ap-textarea"
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Mô tả sản phẩm..."
                  />

                  <div className="ap-field ap-fieldFull">
                    <span className="ap-label">Hướng dẫn sử dụng</span>
                    <textarea
                      className="ap-textarea ap-textareaGuide"
                      rows={3}
                      value={form.usageGuide}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, usageGuide: e.target.value }))
                      }
                      placeholder="Ví dụ: Giặt tay, không dùng chất tẩy mạnh..."
                    />
                  </div>

                  <div className="ap-field ap-fieldFull">
                    <span className="ap-label">Đặc điểm nổi bật</span>
                    <textarea
                      className="ap-textarea ap-textareaHighlight"
                      rows={3}
                      value={form.highlights}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, highlights: e.target.value }))
                      }
                      placeholder="Ví dụ: Chất liệu cotton 100%, thoáng mát..."
                    />
                  </div>
                </div>
              </div>

              {err && <div className="ap-alert">{err}</div>}

              <div className="ap-formActions">
                <button
                  type="button"
                  className="ap-btn ap-btnGhost"
                  onClick={() => !saving && setOpen(false)}
                  disabled={saving}
                >
                  Huỷ
                </button>

                <button
                  type="submit"
                  className="ap-btn ap-btnPrimary"
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
