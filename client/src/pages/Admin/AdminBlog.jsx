import React, { useMemo, useState, useEffect } from "react";
import { toast } from "react-toastify";
import "./AdminBlog.css";

const API_BASE = "http://localhost:5000";
const API_CAT = "http://localhost:5000/api/post-categories";

const STATUS = [
  { key: "all", label: "Tất cả" },
  { key: "draft", label: "Nháp" },
  { key: "published", label: "Đã đăng" },
];

const emptyForm = {
  _id: "",
  title: "",
  slug: "",
  summary: "",
  thumbnail: "",
  categoryKey: "",
  content: "",
  status: "draft",
  publishedAt: "",
  isFeatured: false,
};

export default function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);

  const [showCatForm, setShowCatForm] = useState(false);
  const [newCat, setNewCat] = useState({ label: "", slug: "" });

  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(emptyForm);
  const [touchedSlug, setTouchedSlug] = useState(false);

  /* ================= LOAD POSTS ================= */

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/posts`);
        const data = await res.json();
        setPosts(data.items || []);
      } catch (err) {
        console.error("LOAD POSTS ERROR:", err);
      }
    };

    fetchPosts();
  }, []);

  /* ================= LOAD CATEGORIES ================= */

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(API_CAT);
        const data = await res.json();

        setCategories(data.items || []);
      } catch (err) {
        console.error("LOAD CATEGORIES ERROR:", err);
      }
    };

    fetchCategories();
  }, []);

  /* ================= LOAD USERS ================= */

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users`);
        const data = await res.json();

        const items = Array.isArray(data)
          ? data
          : data.users || data.items || [];
        const clientUsers = items.filter((u) => u.role !== "admin");

        setUsers(clientUsers);
      } catch (err) {
        console.error("LOAD USERS ERROR:", err);
      }
    };

    fetchUsers();
  }, []);

  /* ================= ADD CATEGORY ================= */

  const handleAddCategory = async () => {
    if (!newCat.label.trim() || !newCat.slug.trim()) {
      alert("Nhập đủ tên và slug danh mục");
      return;
    }

    try {
      const res = await fetch(API_CAT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: newCat.slug,
          label: newCat.label,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      setCategories((prev) => [...prev, data]);
      setNewCat({ label: "", slug: "" });
      setShowCatForm(false);
      toast.success("Thêm danh mục thành công");
    } catch (err) {
      console.error("ADD CATEGORY ERROR:", err);
      toast.error("Không thể thêm danh mục");
    }
  };

  /* ================= FILTER ================= */

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();

    return [...posts]
      .filter((p) => {
        const matchQ =
          !keyword ||
          (p.title || "").toLowerCase().includes(keyword) ||
          (p.summary || "").toLowerCase().includes(keyword) ||
          (p.slug || "").toLowerCase().includes(keyword);

        const matchCat =
          filterCat === "all" ? true : p.categoryKey === filterCat;

        const matchStatus =
          filterStatus === "all" ? true : p.status === filterStatus;

        const matchFeatured = featuredOnly ? !!p.isFeatured : true;

        return matchQ && matchCat && matchStatus && matchFeatured;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [posts, q, filterCat, filterStatus, featuredOnly]);

  /* ================= FORM ================= */

  const handleChange = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "title" && !touchedSlug) {
        next.slug = slugifyVN(value);
      }

      return next;
    });
  };

  const resetForm = () => {
    setMode("create");
    setForm(emptyForm);
    setTouchedSlug(false);
  };

  const handleEdit = (post) => {
    setMode("edit");

    setForm({
      _id: post._id,
      title: post.title || "",
      slug: post.slug || "",
      summary: post.summary || "",
      thumbnail: post.thumbnail || "",
      categoryKey: post.categoryKey || "",
      content: post.content || "",
      status: post.status || "draft",
      publishedAt: post.publishedAt
        ? new Date(post.publishedAt).toISOString().slice(0, 10)
        : "",
      isFeatured: !!post.isFeatured,
    });

    setTouchedSlug(true);
  };

  /* ================= NOTIFY CLIENTS ================= */

  const notifyNewPostToClients = async (post) => {
    try {
      if (!post?._id || !post?.title || !post?.slug) return;
      if (!users.length) return;

      const requests = users.map((user) =>
        fetch(`${API_BASE}/api/notifications`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user: user._id,
            title: "Bài viết mới",
            content: `LocalBrand vừa đăng bài viết mới: ${post.title}`,
            link: `/bai-viet/${post.slug}`,
            type: "system",
          }),
        }),
      );

      await Promise.all(requests);
    } catch (err) {
      console.error("CREATE BLOG NOTIFICATIONS ERROR:", err);
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    if (!window.confirm("Xoá bài viết này?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Xoá bài viết thất bại");
      }

      setPosts((prev) => prev.filter((p) => p._id !== id));
      toast.success("Đã xoá bài viết");
    } catch (err) {
      console.error("DELETE POST ERROR:", err);
      toast.error("Không thể xoá bài viết");
    }
  };

  /* ================= TOGGLE PUBLISH ================= */

  const handleTogglePublish = async (id) => {
    const post = posts.find((p) => p._id === id);
    if (!post) return;

    const nextStatus = post.status === "published" ? "draft" : "published";

    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          publishedAt:
            nextStatus === "published" ? new Date().toISOString() : null,
        }),
      });

      const updated = await res.json();

      if (!res.ok) {
        throw new Error(updated.message || "Cập nhật trạng thái thất bại");
      }

      setPosts((prev) => prev.map((p) => (p._id === id ? updated : p)));

      if (post.status !== "published" && updated.status === "published") {
        await notifyNewPostToClients(updated);
        toast.success("Đăng bài thành công và đã gửi thông báo!");
      } else {
        toast.success(
          updated.status === "published" ? "Đã đăng bài" : "Đã chuyển về nháp",
        );
      }
    } catch (err) {
      console.error("TOGGLE PUBLISH ERROR:", err);
      toast.error(err.message || "Không thể đổi trạng thái bài viết");
    }
  };

  /* ================= FEATURED ================= */

  const handleToggleFeatured = async (id) => {
    const post = posts.find((p) => p._id === id);
    if (!post) return;

    try {
      const res = await fetch(`${API_BASE}/api/posts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !post.isFeatured }),
      });

      const updated = await res.json();

      if (!res.ok) {
        throw new Error(updated.message || "Cập nhật nổi bật thất bại");
      }

      setPosts((prev) => prev.map((p) => (p._id === id ? updated : p)));
      toast.success("Đã cập nhật trạng thái nổi bật");
    } catch (err) {
      console.error("TOGGLE FEATURED ERROR:", err);
      toast.error(err.message || "Không thể cập nhật nổi bật");
    }
  };

  /* =============== VALIDATE =============== */

  const validate = () => {
    if (!form.title.trim()) return "Thiếu tiêu đề";
    if (!form.summary.trim()) return "Thiếu mô tả ngắn";
    if (!form.thumbnail.trim()) return "Thiếu thumbnail";
    if (!form.content.trim()) return "Thiếu nội dung";
    if (!form.slug.trim()) return "Thiếu slug";

    return "";
  };

  /* ================= SAVE ================= */

  const handleSave = async (publish = false) => {
    const err = validate();

    if (err) {
      alert(err);
      return;
    }

    const finalStatus = publish ? "published" : form.status;

    const payload = {
      title: form.title,
      slug: form.slug,
      summary: form.summary,
      content: form.content,
      thumbnail: form.thumbnail,
      categoryKey: form.categoryKey,
      status: finalStatus,
      isFeatured: form.isFeatured,
      publishedAt:
        finalStatus === "published"
          ? new Date().toISOString()
          : form.publishedAt || null,
    };

    try {
      if (mode === "create") {
        const res = await fetch(`${API_BASE}/api/posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Tạo bài thất bại");
        }

        setPosts((prev) => [data, ...prev]);

        if (finalStatus === "published") {
          await notifyNewPostToClients(data);
        }

        toast.success(
          finalStatus === "published"
            ? "Đăng bài thành công và đã gửi thông báo!"
            : "Lưu nháp thành công!",
        );

        resetForm();
      } else {
        const oldPost = posts.find((p) => p._id === form._id);

        const res = await fetch(`${API_BASE}/api/posts/${form._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const updated = await res.json();

        if (!res.ok) {
          throw new Error(updated.message || "Cập nhật bài thất bại");
        }

        setPosts((prev) =>
          prev.map((p) => (p._id === updated._id ? updated : p)),
        );

        const justPublished =
          oldPost?.status !== "published" && updated?.status === "published";

        if (justPublished) {
          await notifyNewPostToClients(updated);
          toast.success("Cập nhật bài viết và đã gửi thông báo!");
        } else {
          toast.success("Đã cập nhật bài viết");
        }

        resetForm();
      }
    } catch (err) {
      console.error("SAVE POST ERROR:", err);
      toast.error(err.message || "Không thể lưu bài viết");
    }
  };

  return (
    <div className="ab-page">
      {showCatForm && (
        <div
          className="ab-modalBackdrop"
          onMouseDown={() => setShowCatForm(false)}
        >
          <div className="ab-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ab-modalHead">
              <h3 className="ab-modalTitle">Thêm danh mục</h3>

              <button
                className="ab-btn ab-btn-ghost"
                onClick={() => setShowCatForm(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="ab-row2">
              <label className="ab-field">
                <span>Tên danh mục</span>
                <input
                  value={newCat.label}
                  onChange={(e) => {
                    const label = e.target.value;

                    setNewCat({
                      label,
                      slug: slugifyVN(label),
                    });
                  }}
                />
              </label>

              <label className="ab-field">
                <span>Slug</span>
                <input
                  value={newCat.slug}
                  onChange={(e) =>
                    setNewCat((prev) => ({
                      ...prev,
                      slug: e.target.value,
                    }))
                  }
                  placeholder="vd: cau-chuyen"
                />
              </label>
            </div>

            <div className="ab-formActions">
              <button
                className="ab-btn"
                onClick={() => setShowCatForm(false)}
                type="button"
              >
                Huỷ
              </button>

              <button
                className="ab-btn ab-btn-primary"
                onClick={handleAddCategory}
                type="button"
              >
                Thêm danh mục
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ab-head">
        <div>
          <h3 className="ab-title">Quản lý bài viết</h3>
          <p className="ab-sub">
            Quản lý danh sách bài viết, danh mục blog và trạng thái hiển thị
            trên website.
          </p>
        </div>

        <div className="ab-headActions">
          <button
            className="ab-btn"
            onClick={() => setShowCatForm(!showCatForm)}
            type="button"
          >
            + Tạo danh mục
          </button>

          {mode === "edit" && (
            <button className="ab-btn" onClick={resetForm} type="button">
              Huỷ sửa
            </button>
          )}

          <button
            className="ab-btn ab-btn-primary"
            onClick={() => handleSave(true)}
            type="button"
          >
            {mode === "edit" ? "Cập nhật và đăng" : "Đăng bài"}
          </button>
        </div>
      </div>

      <div className="ab-grid">
        <div className="ab-card">
          <div className="ab-cardTitle">
            {mode === "edit" ? "Sửa bài viết" : "Tạo bài viết"}
          </div>

          <div className="ab-row2">
            <label className="ab-field">
              <span>Tiêu đề</span>
              <input
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
              />
            </label>

            <label className="ab-field">
              <span>Danh mục</span>
              <select
                value={form.categoryKey || ""}
                onChange={(e) => handleChange("categoryKey", e.target.value)}
              >
                <option value="">Chọn danh mục</option>

                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="ab-row2">
            <label className="ab-field">
              <span>Slug</span>
              <input
                value={form.slug}
                onChange={(e) => {
                  setTouchedSlug(true);
                  handleChange("slug", e.target.value);
                }}
              />
            </label>

            <label className="ab-field">
              <span>Thumbnail (URL)</span>

              <input
                value={form.thumbnail}
                onChange={(e) => handleChange("thumbnail", e.target.value)}
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;

                  const reader = new FileReader();

                  reader.onloadend = () => {
                    setForm((prev) => ({
                      ...prev,
                      thumbnail: reader.result,
                    }));
                  };

                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>

          <label className="ab-field">
            <span>Mô tả ngắn</span>
            <textarea
              rows={4}
              value={form.summary}
              onChange={(e) => handleChange("summary", e.target.value)}
            />
          </label>

          <label className="ab-field">
            <span>Nội dung</span>
            <textarea
              rows={10}
              value={form.content}
              onChange={(e) => handleChange("content", e.target.value)}
            />
          </label>

          <div className="ab-formActions">
            <button
              className="ab-btn"
              type="button"
              onClick={() => handleSave(false)}
            >
              {mode === "edit" ? "Cập nhật" : "Lưu nháp"}
            </button>

            <button
              className="ab-btn ab-btn-ghost"
              type="button"
              onClick={resetForm}
            >
              Đặt lại biểu mẫu
            </button>
          </div>
        </div>

        <div className="ab-card">
          <div className="ab-cardTitle">Thiết lập</div>

          <label className="ab-field ab-inline">
            <span>Nổi bật</span>

            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => handleChange("isFeatured", e.target.checked)}
            />
          </label>

          <label className="ab-field">
            <span>Trạng thái</span>

            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="draft">Nháp</option>
              <option value="published">Đã đăng</option>
            </select>
          </label>

          <label className="ab-field">
            <span>Ngày đăng</span>

            <input
              type="date"
              value={form.publishedAt || ""}
              onChange={(e) => handleChange("publishedAt", e.target.value)}
            />
          </label>

          <div className="ab-preview">
            <div className="ab-previewTitle">Xem trước thumbnail</div>

            {form.thumbnail ? (
              <img src={form.thumbnail} alt="thumbnail" />
            ) : (
              <div className="ab-muted">Chưa có ảnh</div>
            )}
          </div>
        </div>
      </div>

      <div className="ab-listHead">
        <h3>Danh sách bài viết</h3>
        <div className="ab-count">{filtered.length} bài</div>
      </div>

      <div className="ab-toolbar">
        <div className="ab-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tiêu đề / slug / mô tả..."
          />

          <button
            type="button"
            className="ab-btn"
            disabled={!q}
            onClick={() => setQ("")}
          >
            Xoá
          </button>
        </div>

        <div className="ab-filters">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            <option value="all">Tất cả danh mục</option>

            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {STATUS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          <label className="ab-check">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
            />
            Chỉ bài nổi bật
          </label>
        </div>
      </div>

      <div className="ab-tableWrap">
        <table className="ab-table">
          <thead>
            <tr>
              <th>Ảnh</th>
              <th>Tiêu đề</th>
              <th>Danh mục</th>
              <th>Trạng thái</th>
              <th>Nổi bật</th>
              <th>Ngày đăng</th>
              <th>Lượt xem</th>
              <th style={{ width: 320 }}>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="ab-empty">
                  Không có bài viết phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className="ab-thumb">
                      <img src={p.thumbnail} alt={p.title} />
                    </div>
                  </td>

                  <td>
                    <div className="ab-postTitle">{p.title}</div>
                    <div className="ab-muted">/{p.slug}</div>
                  </td>

                  <td>
                    {categories.find((c) => c.key === p.categoryKey)?.label ||
                      "Khác"}
                  </td>

                  <td>
                    <span className={`ab-pill ${p.status}`}>
                      {p.status === "published" ? "Đã đăng" : "Nháp"}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className={`ab-pillBtn ${p.isFeatured ? "on" : ""}`}
                      onClick={() => handleToggleFeatured(p._id)}
                    >
                      {p.isFeatured ? "Nổi bật" : "—"}
                    </button>
                  </td>

                  <td>{p.publishedAt ? formatDateVN(p.publishedAt) : "—"}</td>

                  <td>{p.views || 0}</td>

                  <td>
                    <div className="ab-actions">
                      <button
                        className="ab-btn"
                        type="button"
                        onClick={() => handleEdit(p)}
                      >
                        Sửa
                      </button>

                      <button
                        className="ab-btn"
                        type="button"
                        onClick={() => handleTogglePublish(p._id)}
                      >
                        {p.status === "published" ? "Gỡ đăng" : "Đăng"}
                      </button>

                      <button
                        className="ab-btn ab-btn-danger"
                        type="button"
                        onClick={() => handleDelete(p._id)}
                      >
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== Helpers ===== */

function formatDateVN(isoDate) {
  if (!isoDate) return "";

  const d = new Date(isoDate);

  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function slugifyVN(str) {
  return (str || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
