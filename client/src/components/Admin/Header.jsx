import React from "react";
import { Link } from "react-router-dom";

const Header = ({ isCollapsed, toggleSidebar, handleLogout }) => {
  return (
    <header className="admin-header shadow-sm py-3 px-4 d-flex justify-content-between align-items-center sticky-top">
      <div className="d-flex align-items-center">
        <button
          onClick={toggleSidebar}
          className="btn btn-link text-primary p-0 me-4 border-0 bg-transparent"
          style={{ fontSize: "1.4rem" }}
        >
          <i className={`fas ${isCollapsed ? "fa-indent" : "fa-outdent"}`}></i>
        </button>

        <Link
          to="/"
          className="btn btn-outline-secondary admin-view-site-btn border-0 bg-light rounded-pill px-3 fw-bold small d-flex align-items-center shadow-sm"
        >
          <i className="fas fa-globe me-2"></i> Xem Website
        </Link>
      </div>

      <div className="d-flex align-items-center gap-3">
        <button
          onClick={handleLogout}
          className="btn btn-light text-danger btn-sm rounded-circle shadow-sm"
          title="Đăng xuất"
        >
          <i className="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </header>
  );
};

export default Header;
