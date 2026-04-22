import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./notifications.css";

const API_BASE = "http://localhost:5000/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [selectedNoti, setSelectedNoti] = useState(null);
  const [loading, setLoading] = useState(true);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  const fetchNotifications = async () => {
    if (!user?._id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE}/notifications/my/${user._id}`);

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.notifications)
          ? res.data.notifications
          : [];

      setNotifications(data);
    } catch (err) {
      console.log("FETCH NOTIFICATIONS ERROR:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleShowDetail = async (noti) => {
    setSelectedNoti(noti);

    if (!noti?.isRead && user?._id) {
      try {
        await axios.patch(`${API_BASE}/notifications/${noti._id}/read`, {});
        setNotifications((prev) =>
          prev.map((item) =>
            item._id === noti._id ? { ...item, isRead: true } : item,
          ),
        );
      } catch (err) {
        console.log("MARK READ ERROR:", err);
      }
    }
  };

  const deleteItem = async (id) => {
    try {
      await axios.delete(`${API_BASE}/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));

      if (selectedNoti?._id === id) {
        setSelectedNoti(null);
      }
    } catch (err) {
      console.log("DELETE NOTIFICATION ERROR:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?._id || notifications.length === 0) return;

    try {
      await axios.patch(`${API_BASE}/notifications/my/${user._id}/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.log("MARK ALL AS READ ERROR:", err);
    }
  };

  const formatTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleString("vi-VN");
  };

  const getNotiContent = (n) => {
    return n?.content || n?.message || n?.title || "Thông báo";
  };

  return (
    <div className="noti-container">
      <div className="noti-header">
        <h2>Thông báo của tôi</h2>

        <button onClick={markAllAsRead} className="btn-text" type="button">
          Đánh dấu tất cả là đã đọc
        </button>
      </div>

      <div className="noti-list">
        {loading ? (
          <div className="noti-empty">
            <p>Đang tải thông báo...</p>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleShowDetail(n)}
              className={`noti-item ${!n.isRead ? "unread" : ""}`}
            >
              <div className="noti-icon">🔔</div>

              <div className="noti-content">
                <h4>{n.title || "Thông báo"}</h4>
                <p>{getNotiContent(n)}</p>

                <span className="noti-time">
                  {n.timeText || formatTime(n.createdAt)}
                </span>
              </div>

              {!n.isRead && <div className="unread-dot"></div>}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItem(n._id);
                }}
                className="btn-delete"
                type="button"
              >
                🗑
              </button>
            </div>
          ))
        ) : (
          <div className="noti-empty">
            <p>Hiện tại chưa có thông báo!</p>

            <Link to="/" className="back-link">
              Quay lại mua sắm
            </Link>
          </div>
        )}
      </div>

      {selectedNoti && (
        <div className="modal-overlay" onClick={() => setSelectedNoti(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết thông báo</h3>

              <button
                className="btn-close"
                onClick={() => setSelectedNoti(null)}
                type="button"
              >
                ✖
              </button>
            </div>

            <div className="modal-body">
              <h4 className="modal-title">
                {selectedNoti.title || "Thông báo"}
              </h4>

              <p>{getNotiContent(selectedNoti)}</p>

              <span className="modal-time">
                Thời gian:{" "}
                {selectedNoti.timeText || formatTime(selectedNoti.createdAt)}
              </span>

              {selectedNoti.link ? (
                <div style={{ marginTop: 12 }}>
                  <Link to={selectedNoti.link}>Đi tới liên kết</Link>
                </div>
              ) : null}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setSelectedNoti(null)}
                className="btn-confirm"
                type="button"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
