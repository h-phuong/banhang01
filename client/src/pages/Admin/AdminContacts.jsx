import { useEffect, useState } from "react";
import axios from "axios";
import { getContacts, replyContact } from "../../services/contactService";
import "./AdminContacts.css";

const AdminContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [reply, setReply] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const loadContacts = async () => {
    const data = await getContacts();
    setContacts(data);
    setActiveFilter("all");
  };

  const loadPending = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/contacts?status=pending",
    );
    setContacts(res.data);
    setActiveFilter("pending");
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const openReply = (id, oldReply = "") => {
    setSelectedId(id);
    setReply(oldReply || "");
    setShowModal(true);
  };

  const handleReply = async () => {
    await replyContact(selectedId, reply);
    setReply("");
    setShowModal(false);

    if (activeFilter === "pending") {
      loadPending();
    } else {
      loadContacts();
    }
  };

  return (
    <div className="admin-contacts-page">
      <div className="admin-contacts-head">
        <div>
          <h2 className="admin-contacts-title">Quản lý liên hệ</h2>
          <p className="admin-contacts-subtitle">
            Theo dõi các liên hệ từ khách hàng và phản hồi trực tiếp.
          </p>
        </div>
      </div>

      <div className="admin-top-actions">
        <button
          className={`admin-btn ${
            activeFilter === "all"
              ? "admin-btn-primary admin-btn-active"
              : "admin-btn-ghost"
          }`}
          onClick={loadContacts}
        >
          Tất cả
        </button>

        <button
          className={`admin-btn ${
            activeFilter === "pending"
              ? "admin-btn-primary admin-btn-active"
              : "admin-btn-ghost"
          }`}
          onClick={loadPending}
        >
          Chưa trả lời
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nội dung</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan="4" className="admin-empty">
                  Không có liên hệ
                </td>
              </tr>
            ) : (
              contacts.map((c) => {
                const isReplied = c.reply && c.reply.trim() !== "";

                return (
                  <tr key={c._id}>
                    <td>
                      <div className="admin-cell-main">{c.email}</div>
                    </td>

                    <td>
                      <div className="admin-message-cell">{c.message}</div>
                    </td>

                    <td>
                      {isReplied ? (
                        <span className="admin-badge replied">Đã trả lời</span>
                      ) : (
                        <span className="admin-badge pending">
                          Chưa trả lời
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="admin-actions">
                        <button
                          className={`admin-btn ${
                            isReplied ? "admin-btn-ghost" : "admin-btn-primary"
                          }`}
                          onClick={() => openReply(c._id, c.reply)}
                        >
                          {isReplied ? "Xem / sửa" : "Trả lời"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="reply-modal" onClick={() => setShowModal(false)}>
          <div className="reply-box" onClick={(e) => e.stopPropagation()}>
            <h3>Trả lời liên hệ</h3>

            <div className="reply-body">
              <textarea
                placeholder="Nhập nội dung trả lời..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />

              <div className="reply-actions">
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setShowModal(false);
                    setReply("");
                  }}
                >
                  Hủy
                </button>

                <button className="btn-send" onClick={handleReply}>
                  Gửi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContacts;
