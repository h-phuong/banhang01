import React from "react";
import { Link } from "react-router-dom";
import "./layclient.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Cột 1 */}
        <div className="footer-col-1">
          <a href="/" className="footer-logo-link">
            <h3 className="footer-logo">LocalBrand</h3>
          </a>
          <p className="footer-desc">
            Tự hào là LocalBrand Việt – thiết kế bởi người Việt, dành cho người
            Việt. Mang phong cách streetwear hiện đại, trẻ trung và cá tính.
          </p>

          <div className="footer-apps">
            <button type="social-button" className="google-btn">
              <img
                src="https://www.svgrepo.com/show/382724/google-play-store.svg"
                alt="Google"
              />
              Google Play
            </button>

            <button type="social-button" className="apple-btn">
              <img
                src="https://www.svgrepo.com/show/475633/apple-color.svg"
                alt="Apple"
              />
              App Store
            </button>
          </div>

          <div className="footer-social">
            <i className="fab fa-facebook-f"></i>
            <i className="fab fa-instagram"></i>
          </div>
        </div>

        {/* Cột 2 */}
        <div className="footer-col-2">
          <h3>Hỗ trợ khách hàng</h3>
          <ul>
            <li>
              <Link to="/bai-viet/chinh-sach-doi-tra">Chính sách đổi trả</Link>
            </li>
            <li>
              <Link to="/bai-viet/huong-dan-mua-hang">Hướng dẫn mua hàng</Link>
            </li>
            <li>
              <Link to="/bai-viet/cau-hoi-thuong-gap">Câu hỏi thường gặp</Link>
            </li>
            <li>
              <Link to="/contact">Liên hệ hỗ trợ</Link>
            </li>
          </ul>
        </div>

        {/* Cột 3 */}
        <div className="footer-col-3">
          <h3>Thông tin liên hệ</h3>
          <ul>
            <li>Địa chỉ: TP. Hồ Chí Minh</li>
            <li>Hotline: 0123 456 789</li>
            <li>Email: localbrandshop@gmail.com</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        © 2026 LocalBrand Shop. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
