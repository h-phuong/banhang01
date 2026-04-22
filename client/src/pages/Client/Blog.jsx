import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./blog.css";

const API_BASE = "http://localhost:5000";

const CATEGORIES = [
  { key: "all", label: "Tất cả" },
  { key: "story", label: "Câu chuyện" },
  { key: "style_design", label: "Phối đồ & Thiết kế" },
  { key: "trend", label: "Xu hướng" },
];

export default function BlogPage() {
  const [activeCat, setActiveCat] = useState("all");
  const [q, setQ] = useState("");

  // Pagination giống Category: Trước / Trang x/y / Sau
  const PAGE_SIZE = 9;
  const [page, setPage] = useState(1);

  // ===== API state =====
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  // ===== Fetch posts from BE =====
  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      try {
        setLoading(true);
        setErrMsg("");
        const res = await fetch(
          `${API_BASE}/api/posts?status=published&t=${Date.now()}`,
          {
            method: "GET",
            headers: { "Cache-Control": "no-cache" },
          },
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Không tải được bài viết");
        }

        // BE trả {items: [...]}
        const items = Array.isArray(data?.items) ? data.items : [];

        // Normalize date
        const normalized = items.map((p) => ({
          ...p,
          categoryKey: p.categoryKey || p.category || p.category?.slug || "",
          publishedAt: p.publishedAt ? toISODate(p.publishedAt) : "",
          views: p.views || 0,
          isFeatured: !!p.isFeatured,
        }));

        if (isMounted) setArticles(normalized);
      } catch (e) {
        if (isMounted) setErrMsg(e.message || "Lỗi tải bài viết");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, []);
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/post-categories`);
        const data = await res.json();

        const items = Array.isArray(data?.items) ? data.items : [];
        const mapped = items.map((c) => ({
          key: c.slug || c.key || c._id,
          label: c.name || c.label,
        }));

        setCategories([{ key: "all", label: "Tất cả" }, ...mapped]);
      } catch (err) {
        console.error("Load categories error:", err);
      }
    };

    fetchCategories();
  }, []);
  useEffect(() => {
    setPage(1);
  }, [activeCat, q]);
  const featured = useMemo(() => {
    if (!articles.length) return null;

    const f = articles.find((a) => a.isFeatured);
    if (f) return f;

    return [...articles].sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
    )[0];
  }, [articles]);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return [...articles]
      .filter((a) => {
        const matchCat =
          activeCat === "all" ? true : a.categoryKey === activeCat;

        const matchQ =
          !keyword ||
          (a.title || "").toLowerCase().includes(keyword) ||
          (a.summary || "").toLowerCase().includes(keyword);

        return matchCat && matchQ;
      })
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }, [articles, activeCat, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="blog-page">
      <div className="blog-container">
        {/* HERO */}
        <header className="blog-hero">
          {/* CỘT TRÁI: 2 BOX (GU + VOUCHER) */}
          <div className="blog-hero-left-wrap">
            {/* Box 1: GU */}
            <div className="blog-hero-left">
              <div className="blog-kicker">LOCALBRAND BLOG</div>
              <h1 className="blog-title">GU-Mỗi Ngày</h1>
              <p className="blog-sub">
                Câu chuyện thương hiệu • Phối đồ & thiết kế • Xu hướng Gen Z
              </p>

              {/* Search */}
              <div className="blog-search">
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm bài viết: outfit đi học, oversize, cotton..."
                />
                <button
                  type="button"
                  className="blog-btn"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                  }}
                  disabled={!q}
                  title="Xoá tìm kiếm"
                >
                  Xoá
                </button>
              </div>

              {/* Tabs */}
              <div className="blog-tabs">
                {categories.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`blog-tab ${activeCat === c.key ? "active" : ""}`}
                    onClick={() => {
                      setActiveCat(c.key);
                      setPage(1);
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Featured */}
          {!loading && featured && (
            <Link
              to={`/bai-viet/${featured.slug || featured._id}`}
              className="blog-featured"
            >
              <img
                className="blog-featured-img"
                src={featured.thumbnail}
                alt={featured.title}
              />
              <div className="blog-featured-body">
                <span className="blog-badge">
                  {categoryLabel(featured.categoryKey, categories)}
                </span>
                <h2 className="blog-featured-title">{featured.title}</h2>
                <p className="blog-featured-summary">{featured.summary}</p>

                <div className="blog-meta">
                  <span className="blog-date">
                    {formatDateVN(featured.publishedAt)}
                  </span>
                  <span className="blog-dot">•</span>
                  <span className="blog-views">
                    <i className="far fa-eye"></i>
                    {formatViews(featured.views)} lượt xem
                  </span>
                  <span className="blog-dot">•</span>
                  <span className="blog-cta">Đọc ngay</span>
                </div>
              </div>
            </Link>
          )}
        </header>
        {/* ==== */}
        {/* LIST */}
        {/* ==== */}
        <section className="blog-section">
          <div className="blog-section-head">
            <h3 className="blog-section-title">
              {activeCat === "all"
                ? "Tất cả bài viết"
                : `Chuyên mục: ${categoryLabel(activeCat, categories)}`}
            </h3>

            <div className="blog-count">
              {loading ? "Đang tải..." : `${filtered.length} bài`}
            </div>
          </div>

          {/* Loading / Error */}
          {loading ? (
            <div className="blog-empty">
              <div className="blog-empty-title">Đang tải bài viết...</div>
              <div className="blog-muted">Vui lòng đợi chút.</div>
            </div>
          ) : errMsg ? (
            <div className="blog-empty">
              <div className="blog-empty-title">Không tải được bài viết</div>
              <div className="blog-muted">{errMsg}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="blog-empty">
              <div className="blog-empty-title">Không tìm thấy bài viết</div>
              <div className="blog-muted">
                Thử đổi chuyên mục hoặc tìm từ khoá khác.
              </div>
              <button
                className="blog-btn blog-btn-primary"
                type="button"
                onClick={() => {
                  setActiveCat("all");
                  setQ("");
                  setPage(1);
                }}
              >
                Reset bộ lọc
              </button>
            </div>
          ) : (
            <>
              <div className="blog-grid">
                {pageItems.map((a) => (
                  <Link
                    to={`/bai-viet/${a.slug || a._id}`}
                    className="blog-item"
                    key={a._id}
                  >
                    <div className="blog-item-imgwrap">
                      <img src={a.thumbnail} alt={a.title} loading="lazy" />
                      <span className="blog-badge blog-badge-onimg">
                        {categoryLabel(a.categoryKey, categories)}
                      </span>
                    </div>

                    <div className="blog-item-body">
                      <div className="blog-date">
                        {formatDateVN(a.publishedAt)}
                      </div>
                      <h4 className="blog-item-title">{a.title}</h4>
                      <p className="blog-item-desc">{a.summary}</p>

                      <div className="blog-meta blog-meta-small">
                        <span className="blog-views">
                          <i className="far fa-eye"></i>
                          {formatViews(a.views)} lượt xem
                        </span>
                        <span className="blog-dot">•</span>
                        <span className="blog-cta">Xem chi tiết</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination giống Category */}
              <div className="blog-pagination">
                <button
                  className="blog-page-btn"
                  onClick={handlePrevPage}
                  disabled={page === 1}
                  type="button"
                >
                  Trước
                </button>

                <span className="blog-page-text">
                  Trang {page} / {totalPages}
                </span>

                <button
                  className="blog-page-btn"
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
    </div>
  );
}

/* Helpers */
function categoryLabel(key, categories) {
  const found = categories.find((x) => x.key === key);
  return found ? found.label : "Khác";
}

function formatDateVN(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatViews(num) {
  if (!num) return 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num;
}

// Convert Date string -> YYYY-MM-DD để sort/format ổn định
function toISODate(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
