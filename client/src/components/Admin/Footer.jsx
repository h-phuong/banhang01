import React from "react";
import { Link } from "react-router-dom";

const Footer = ({ user, avatarUrl, isCollapsed }) => {
  return (
    <div className="p-3 border-top border-light border-opacity-25">
      <Link
        to="/admin/profile"
        className="d-flex align-items-center text-white text-decoration-none user-profile-link rounded p-2 transition-all"
      >
        <img
          src={avatarUrl}
          className="rounded-circle"
          width="36"
          height="36"
          alt="User"
        />

        {!isCollapsed && (
          <div className="ms-2 small">
            <div className="fw-bold">{user.name}</div>
            <div style={{ fontSize: "10px", opacity: 0.8 }}>Xem hồ sơ</div>
          </div>
        )}
      </Link>
    </div>
  );
};

export default Footer;
