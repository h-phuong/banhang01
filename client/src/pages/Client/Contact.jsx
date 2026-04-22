import "./Contact.css";
import { useEffect, useState } from "react";
import { sendContact } from "../../services/contactService";

const API_BASE = "http://localhost:5000/api";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [loadingUser, setLoadingUser] = useState(false);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const rawUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        const storedUser = rawUser ? JSON.parse(rawUser) : null;
        const userId = storedUser?._id || storedUser?.id;

        if (!userId) return;

        setLoadingUser(true);

        const res = await fetch(`${API_BASE}/users/${userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setFormData((prev) => ({
            ...prev,
            name: data?.fullName || data?.name || storedUser?.fullName || "",
            email: data?.email || storedUser?.email || "",
            phone:
              data?.phoneNumber ||
              data?.phone ||
              storedUser?.phoneNumber ||
              storedUser?.phone ||
              "",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            name: storedUser?.fullName || storedUser?.name || "",
            email: storedUser?.email || "",
            phone: storedUser?.phoneNumber || storedUser?.phone || "",
          }));
        }
      } catch (error) {
        console.error("Load user info error:", error);

        try {
          const rawUser = localStorage.getItem("user");
          const storedUser = rawUser ? JSON.parse(rawUser) : null;

          if (storedUser) {
            setFormData((prev) => ({
              ...prev,
              name: storedUser?.fullName || storedUser?.name || "",
              email: storedUser?.email || "",
              phone: storedUser?.phoneNumber || storedUser?.phone || "",
            }));
          }
        } catch (parseError) {
          console.error("Parse localStorage user error:", parseError);
        }
      } finally {
        setLoadingUser(false);
      }
    };

    loadUserInfo();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await sendContact(formData);

      alert("Gửi liên hệ thành công!");

      setFormData((prev) => ({
        ...prev,
        message: "",
      }));
    } catch (error) {
      console.error(error);
      alert("Gửi thất bại");
    }
  };

  return (
    <div className="contact">
      <div className="contact-banner">
        <h2>Liên Hệ Với Chúng Tôi</h2>
        <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7</p>
      </div>

      <div className="contact-container">
        <div className="contact-form">
          <div className="heading">
            <h3>Liên Hệ</h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Họ và tên</label>
              <input
                type="text"
                name="name"
                placeholder="Nhập họ và tên..."
                value={formData.name}
                onChange={handleChange}
                disabled={loadingUser}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="Nhập email..."
                value={formData.email}
                onChange={handleChange}
                disabled={loadingUser}
              />
            </div>

            <div className="form-group">
              <label>Số điện thoại</label>
              <input
                type="text"
                name="phone"
                placeholder="Nhập số điện thoại..."
                value={formData.phone}
                onChange={handleChange}
                disabled={loadingUser}
              />
            </div>

            <div className="form-group">
              <label>Nội dung</label>
              <textarea
                rows="5"
                name="message"
                placeholder="Nhập nội dung..."
                value={formData.message}
                onChange={handleChange}
              ></textarea>
            </div>

            <button type="submit" className="contact-btn">
              Gửi liên hệ
            </button>
          </form>
        </div>

        <div className="contact-info-box">
          <div className="heading">
            <h3>Thông tin liên hệ</h3>
          </div>

          <div className="info-list">
            <div className="info-item">
              <i className="fas fa-map-marker-alt"></i>
              <div>
                <h4>Địa chỉ</h4>
                <p>TP. Hồ Chí Minh</p>
              </div>
            </div>

            <div className="info-item">
              <i className="fas fa-phone-alt"></i>
              <div>
                <h4>Hotline</h4>
                <p>0123 456 789</p>
              </div>
            </div>

            <div className="info-item">
              <i className="fas fa-envelope"></i>
              <div>
                <h4>Email</h4>
                <p>localbrandshop@gmail.com</p>
              </div>
            </div>

            <div className="info-item">
              <i className="fas fa-clock"></i>
              <div>
                <h4>Giờ hoạt động</h4>
                <p>08:00 - 22:00 (T2 - CN)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="contact-map">
        <iframe
          title="map"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1473936145962!2d106.65184127408926!3d10.80002108935016!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3175292976c117ad%3A0x5b3f38b21051f84!2zSOG7jWMgVmnhu4duIEjDoG5nIEtow7VuZyBWaeG7h3QgTmFtIENTMg!5e0!3m2!1svi!2s!4v1776640417123!5m2!1svi!2s"
          width="100%"
          height="350"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>
  );
}
