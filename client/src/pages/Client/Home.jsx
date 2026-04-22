import { useEffect, useMemo, useRef, useState } from "react";
import ProCardGrid from "../../components/common/ProCard/ProCardGrid.jsx";
import FeedBackList from "../../components/common/FeedBack/FeedBackList.jsx";
import Banner from "../../components/Client/Banner.jsx";
import { useCart } from "../../context/CartContext";
import "./Home.css";

const API_BASE = "http://localhost:5000";

// ==============================
// HELPERS
// ==============================
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

function extractPosts(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.docs)) return data.docs;
  if (Array.isArray(data.posts)) return data.posts;
  if (Array.isArray(data.data)) return data.data;
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

function getPostImage(post) {
  if (typeof post?.thumbnail === "string" && post.thumbnail.trim()) {
    return toAbsoluteImageUrl(post.thumbnail);
  }

  return "https://via.placeholder.com/600x400?text=No+Image";
}

function formatPostDate(post) {
  const raw = post?.publishedAt || post?.createdAt || "";
  if (!raw) return "---";

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "---";

  return d.toLocaleDateString("vi-VN");
}

export default function Home() {
  const { addToCart } = useCart();
  const sliderRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loadingPro, setLoadingPro] = useState(true);
  const [errorPro, setErrorPro] = useState("");

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorPosts, setErrorPosts] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setLoadingPro(true);
      setErrorPro("");

      try {
        const res = await fetch(
          `${API_BASE}/api/products?featured=true&limit=8&t=${Date.now()}`,
          {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          },
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Không lấy được danh sách sản phẩm");
        }

        const list = extractProducts(data);

        if (!isMounted) return;
        setProducts(list);
      } catch (err) {
        console.log("Fetch featured products error:", err);
        if (!isMounted) return;
        setErrorPro(err?.message || "Lỗi không xác định");
        setProducts([]);
      } finally {
        if (isMounted) setLoadingPro(false);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      setLoadingPosts(true);
      setErrorPosts("");

      try {
        const res = await fetch(
          `${API_BASE}/api/posts?status=published&t=${Date.now()}`,
          {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          },
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Không lấy được bài viết");
        }

        const list = extractPosts(data);

        if (!isMounted) return;
        setPosts(list.slice(0, 3));
      } catch (err) {
        console.log("Fetch posts error:", err);
        if (!isMounted) return;
        setErrorPosts(err?.message || "Lỗi tải bài viết");
        setPosts([]);
      } finally {
        if (isMounted) setLoadingPosts(false);
      }
    };

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayProducts = useMemo(() => {
    return products.map((p) => ({
      ...p,
      images: [getMainImage(p)],
      price: Number(p?.price || 0),
      isNew: Boolean(p?.isNew),
      isSale: Boolean(p?.isSale),
    }));
  }, [products]);

  const scrollProducts = (direction) => {
    if (!sliderRef.current) return;

    const amount = sliderRef.current.clientWidth * 0.72;
    sliderRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="home">
      <Banner />

      <section className="home-pro">
        <div className="heading">
          <h3>Sản phẩm nổi bật</h3>
        </div>

        <div className="product-slider-wrap">
          {!loadingPro && !errorPro && displayProducts.length > 5 && (
            <button
              className="product-slider-btn product-slider-btn-left"
              type="button"
              onClick={() => scrollProducts("left")}
              aria-label="Xem sản phẩm trước"
            >
              ‹
            </button>
          )}

          <div className="pro-card pro-card-slider" ref={sliderRef}>
            {loadingPro && (
              <div className="home-state-box home-state-info">
                Đang tải sản phẩm...
              </div>
            )}

            {!loadingPro && errorPro && (
              <div className="home-state-box home-state-error">
                Lỗi: {errorPro}
              </div>
            )}

            {!loadingPro && !errorPro && displayProducts.length === 0 && (
              <div className="home-state-box home-state-empty">
                Chưa có sản phẩm nổi bật nào.
              </div>
            )}

            {!loadingPro &&
              !errorPro &&
              displayProducts.map((item) => (
                <div className="product-slide-item" key={item._id}>
                  <ProCardGrid product={item} onAddToCart={addToCart} />
                </div>
              ))}
          </div>

          {!loadingPro && !errorPro && displayProducts.length > 5 && (
            <button
              className="product-slider-btn product-slider-btn-right"
              type="button"
              onClick={() => scrollProducts("right")}
              aria-label="Xem sản phẩm tiếp theo"
            >
              ›
            </button>
          )}
        </div>
      </section>

      <section className="home-service">
        <div className="service-item service-box">
          <i className="fas fa-truck"></i>
          <h4>Giao hàng toàn quốc</h4>
          <p>Ship nhanh toàn quốc, nhận hàng cực tiện</p>
        </div>

        <div className="service-item service-box">
          <i className="fas fa-sync-alt"></i>
          <h4>Đổi trả dễ dàng</h4>
          <p>Hỗ trợ đổi trả trong vòng 7 ngày</p>
        </div>

        <div className="service-item service-box">
          <i className="fas fa-shield-alt"></i>
          <h4>Bảo mật thanh toán</h4>
          <p>Thông tin khách hàng luôn được bảo vệ</p>
        </div>

        <div className="service-item service-box">
          <i className="fas fa-headset"></i>
          <h4>Hỗ trợ 24/7</h4>
          <p>Luôn sẵn sàng hỗ trợ mọi lúc</p>
        </div>
      </section>

      <section className="home-banner">
        <div className="banner-left">
          <div className="banner-item banner-box banner-large-box">
            <img
              src="https://i.pinimg.com/1200x/50/ef/0b/50ef0ba407223310229e931710ba56b8.jpg"
              alt=""
            />
            <button>Explore Now</button>
          </div>

          <div className="banner-item banner-box banner-large-box">
            <img
              src="https://i.pinimg.com/1200x/32/09/0b/32090b06a3278ef51ac13d94b1c1ba0e.jpg"
              alt=""
            />
            <button>Explore Now</button>
          </div>
        </div>

        <div className="banner-right">
          <div className="banner-item banner-box banner-small-box">
            <img
              src="https://i.pinimg.com/736x/dd/dd/d7/ddddd7d9e4ab53ce241c88c0aedd795a.jpg"
              alt=""
            />
            <div className="banner-text banner-text-box">
              <p>More Collection</p>
              <h4>Stylish Winter T-Shirt for Woman</h4>
              <button>Check Now</button>
            </div>
          </div>

          <div className="banner-item banner-box banner-small-box">
            <img
              src="https://i.pinimg.com/1200x/6d/dd/ee/6dddeef6f75690ba9c2392d32b3820cd.jpg"
              alt=""
            />
            <div className="banner-text banner-text-box">
              <p>New Collection</p>
              <h4>Stylish Winter Shirt for Man</h4>
              <button>Check Now</button>
            </div>
          </div>
        </div>
      </section>

      <section className="home-blog">
        <div className="heading">
          <h3>Bài viết mới</h3>
        </div>

        <div className="blog-list">
          {loadingPosts && (
            <div className="home-state-box home-state-info">
              Đang tải bài viết...
            </div>
          )}

          {!loadingPosts && errorPosts && (
            <div className="home-state-box home-state-error">
              Lỗi: {errorPosts}
            </div>
          )}

          {!loadingPosts && !errorPosts && posts.length === 0 && (
            <div className="home-state-box home-state-empty">
              Chưa có bài viết nào.
            </div>
          )}

          {!loadingPosts &&
            !errorPosts &&
            posts.map((post) => (
              <div className="blog-item blog-card-box" key={post._id}>
                <img
                  src={getPostImage(post)}
                  alt={post.title || "blog"}
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://via.placeholder.com/600x400?text=No+Image";
                  }}
                />
                <div className="blog-body">
                  <span className="blog-date">{formatPostDate(post)}</span>
                  <h4>{post.title || "Bài viết"}</h4>
                  <p>{post.summary || post.description || "Chưa có mô tả."}</p>
                  <a href={`/bai-viet/${post.slug}`}>Xem chi tiết</a>
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="home-feedback">
        <div className="heading">
          <h3>Đánh giá từ khách hàng</h3>
        </div>

        <div className="feedback-box-wrap">
          <FeedBackList />
        </div>
      </section>
    </div>
  );
}
