import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import "./layclient.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isLogin = !!user;

  const Logout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleSearch = () => {
    const value = keyword.trim();

    if (!value) {
      navigate("/category");
      return;
    }

    navigate(`/category?search=${encodeURIComponent(value)}`);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      setScrolled(y > 48);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // initialize collapsed state on mobile widths
    const check = () => {
      const w = window.innerWidth || document.documentElement.clientWidth;
      setIsCollapsed(w <= 1024);
    };
    check();
    const onResize = () => check();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
<nav className={`navbar ${scrolled ? 'scrolled' : ''} ${isCollapsed ? 'collapsed' : ''}`}>      <button
        className={`hamburger ${mobileOpen ? "open" : ""}`}
        aria-controls="mobile-drawer"
        aria-expanded={mobileOpen}
        onClick={() => {
          const next = !mobileOpen;
          setMobileOpen(next);
          // when opening mobile drawer, expand header; when closing, collapse again on mobile
          setIsCollapsed(!next && (window.innerWidth <= 1024));
        }}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className="navbar-left">
        <Link to="/">
          <h2 className="logo localbrand">LocalBrand</h2>
        </Link>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          <i
            className="nav-icon fas fa-search"
            onClick={handleSearch}
            style={{ cursor: "pointer" }}
          ></i>
        </div>
      </div>

      <ul className="navbar-menu">
        <li>
          <Link to="/">Trang Chủ</Link>
        </li>
        <li>
          <Link to="/category">Danh Mục</Link>
        </li>
        <li>
          <Link to="/blog">Blog</Link>
        </li>
        <li>
          <Link to="/sale">Khuyến Mãi</Link>
        </li>
        <li>
          <Link to="/contact">Liên Hệ</Link>
        </li>
      </ul>

      <div className="navbar-right">
        {!isLogin ? (
          <>
            <Link to="/login" className="login-btn">
              <i className="fas fa-user"></i>Đăng nhập
            </Link>

            <Link to="/cart" title="Giỏ hàng">
              <i className="fas fa-shopping-cart cart-icon"></i>
            </Link>
          </>
        ) : (
          <>
            <Link to="/notifications" title="Thông báo">
              <i className="fas fa-bell cart-icon"></i>
            </Link>

            <Link to="/cart" title="Giỏ hàng">
              <i className="fas fa-shopping-cart cart-icon"></i>
            </Link>

            <Link to="/profile" title="Hồ sơ">
              <i className="fas fa-user-circle cart-icon"></i>
            </Link>
          </>
        )}
      </div>

      {/* Mobile drawer + overlay */}
      <div
        className={`mobile-overlay ${mobileOpen ? "show" : ""}`}
        onClick={() => { setMobileOpen(false); if (window.innerWidth <= 1024) setIsCollapsed(true); }}
        aria-hidden={!mobileOpen}
      />

      <aside
        id="mobile-drawer"
        className={`mobile-drawer ${mobileOpen ? "open" : ""}`}
        aria-hidden={!mobileOpen}
      >
        <ul>
          <li onClick={() => { setMobileOpen(false); if (window.innerWidth <= 1024) setIsCollapsed(true); }}>
            <Link to="/">Trang Chủ</Link>
          </li>
          <li onClick={() => { setMobileOpen(false); if (window.innerWidth <= 1024) setIsCollapsed(true); }}>
            <Link to="/category">Danh Mục</Link>
          </li>
          <li onClick={() => { setMobileOpen(false); if (window.innerWidth <= 1024) setIsCollapsed(true); }}>
            <Link to="/blog">Blog</Link>
          </li>
          <li onClick={() => { setMobileOpen(false); if (window.innerWidth <= 1024) setIsCollapsed(true); }}>
            <Link to="/sale">Khuyến Mãi</Link>
          </li>
          <li onClick={() => { setMobileOpen(false); if (window.innerWidth <= 1024) setIsCollapsed(true); }}>
            <Link to="/contact">Liên Hệ</Link>
          </li>
        </ul>

        <div className="mobile-actions">
          {!isLogin ? (
            <Link to="/login" className="login-btn" onClick={() => { setMobileOpen(false); if (window.innerWidth <= 1024) setIsCollapsed(true); }}>
              <i className="fas fa-user"></i>Đăng nhập
            </Link>
          ) : (
            <Link to="/profile" onClick={() => { setMobileOpen(false); if (window.innerWidth <= 1024) setIsCollapsed(true); }} className="login-btn">
              <i className="fas fa-user-circle"></i>Hồ sơ
            </Link>
          )}

          <Link to="/cart" onClick={() => { setMobileOpen(false); if (window.innerWidth <= 1024) setIsCollapsed(true); }} className="cart-mobile">
            <i className="fas fa-shopping-cart"></i>Giỏ hàng
          </Link>
        </div>
      </aside>
    </nav>
  );
}
