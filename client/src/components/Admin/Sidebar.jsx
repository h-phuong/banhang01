import React from "react";
import { Link } from "react-router-dom";
import Footer from "./Footer";

const Sidebar = ({ isCollapsed, sidebarWidth, isActive, user, avatarUrl }) => {
  const role = user?.role || "admin";

  const menuSections = [
    {
      title: "TỔNG QUAN",
      items: [
        {
          path: "/admin",
          icon: "tachometer-alt",
          label: "Dashboard",
          roles: ["admin", "manager", "staff"],
        },
      ],
    },

    {
      title: "QUẢN LÝ NGƯỜI DÙNG",
      items: [
        {
          path: "/admin/users",
          icon: "users",
          label: "Người dùng",
          roles: ["admin", "manager"],
        },
        {
          path: "/admin/reviews",
          icon: "comments",
          label: "Đánh giá",
          roles: ["admin", "manager", "staff"],
        },
      ],
    },

    {
      title: "QUẢN LÝ SẢN PHẨM",
      items: [
        {
          path: "/admin/categories",
          icon: "layer-group",
          label: "Danh mục",
          roles: ["admin", "manager"],
        },
        {
          path: "/admin/products",
          icon: "box",
          label: "Sản phẩm",
          roles: ["admin", "manager", "staff"],
        },
        {
          path: "/admin/inventory",
          icon: "warehouse",
          label: "Tồn kho",
          roles: ["admin", "manager"],
        },
      ],
    },

    {
      title: "QUẢN LÝ BÁN HÀNG",
      items: [
        {
          path: "/admin/orders",
          icon: "shopping-cart",
          label: "Đơn hàng",
          roles: ["admin", "manager", "staff"],
        },
        {
          path: "/admin/promotions",
          icon: "tags",
          label: "Khuyến mãi",
          roles: ["admin", "manager"],
        },
        {
          path: "/admin/contacts",
          icon: "envelope",
          label: "Liên hệ",
          roles: ["admin", "manager", "staff"],
        },
      ],
    },

    {
      title: "NỘI DUNG",
      items: [
        {
          path: "/admin/upload",
          icon: "images",
          label: "Kho lưu trữ",
          roles: ["admin", "manager"],
        },
        {
          path: "/admin/blogs",
          icon: "newspaper",
          label: "Bài viết",
          roles: ["admin", "manager"],
        },
      ],
    },
  ];

  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={`d-flex flex-column text-white sidebar-gradient ${
        isCollapsed ? "collapsed-mode" : ""
      }`}
      style={{
        width: sidebarWidth,
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      {/* LOGO */}
      <div
        className="d-flex align-items-center justify-content-center p-3 flex-shrink-0"
        style={{ height: "70px" }}
      >
        <Link
          to="/admin"
          className="text-white text-decoration-none d-flex align-items-center justify-content-center w-100"
        >
          <i className="fas fa-laugh-wink fa-2x"></i>
          {!isCollapsed && <span className="fs-5 fw-bold ms-3">ADMIN</span>}
        </Link>
      </div>

      <hr className="m-0 border-light opacity-25" />

      {/* MENU */}
      <div className="sidebar-scroll flex-grow-1 px-2 py-3">
        <ul className="nav flex-column">
          {filteredSections.map((section, index) => (
            <div key={index}>
              {!isCollapsed && (
                <div className="menu-heading px-3 mt-3 mb-1 small text-white-50 fw-bold">
                  {section.title}
                </div>
              )}

              {section.items.map((item) => (
                <li className="nav-item" key={item.path}>
                  <Link
                    to={item.path}
                    className={`nav-link-custom ${isActive(item.path)}`}
                  >
                    <i className={`fas fa-${item.icon} fa-fw me-3`}></i>
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              ))}
            </div>
          ))}
        </ul>
      </div>

      <Footer user={user} avatarUrl={avatarUrl} isCollapsed={isCollapsed} />
    </aside>
  );
};

export default Sidebar;
