import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showReplyModal, setShowReplyModal] = useState(false);
  const [currentReviewId, setCurrentReviewId] = useState(null);
  const [replyContent, setReplyContent] = useState("");

  const fetchReviews = () => {
    setLoading(true);

    fetch("http://localhost:5000/api/reviews")
      .then((res) => res.json())
      .then((data) => {
        const list = data.docs || (Array.isArray(data) ? data : []);
        setReviews(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa đánh giá này không?")) return;

    fetch(`http://localhost:5000/api/reviews/${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (res.ok) {
          toast.success("Đã xóa đánh giá");
          setReviews(reviews.filter((r) => r._id !== id));
        } else {
          toast.error("Lỗi khi xóa");
        }
      })
      .catch(() => toast.error("Lỗi kết nối"));
  };

  const handleApprove = (id) => {
    axios
      .put(`http://localhost:5000/api/reviews/${id}/approve`)
      .then(() => {
        toast.success("Đã duyệt đánh giá");
        fetchReviews();
      })
      .catch(() => toast.error("Lỗi duyệt"));
  };

  const handleReject = (id) => {
    axios
      .put(`http://localhost:5000/api/reviews/${id}/reject`)
      .then(() => {
        toast.warning("Đã từ chối đánh giá");
        fetchReviews();
      })
      .catch(() => toast.error("Lỗi từ chối"));
  };

  const handleChangeStatus = (id, status) => {
    if (status === "approved") handleApprove(id);
    if (status === "rejected") handleReject(id);
  };

  const openReplyModal = (id) => {
    setCurrentReviewId(id);
    setReplyContent("");
    setShowReplyModal(true);
  };

  const sendReply = () => {
    if (!replyContent) {
      toast.warning("Nhập nội dung trả lời");
      return;
    }

    axios
      .put(`http://localhost:5000/api/reviews/${currentReviewId}/reply`, {
        reply: replyContent,
      })
      .then(() => {
        toast.success("Đã trả lời khách");
        setShowReplyModal(false);
        fetchReviews();
      })
      .catch(() => toast.error("Lỗi khi gửi"));
  };

  const renderStars = (rating) => {
    let stars = [];

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          style={{
            color: i <= rating ? "#f1c40f" : "#d9e2e8",
            fontSize: "15px",
            lineHeight: 1,
          }}
        >
          ★
        </span>,
      );
    }

    return stars;
  };

  const getStatusStyle = (status) => {
    if (status === "approved") {
      return {
        background: "rgba(76, 175, 80, 0.1)",
        color: "#2e7d32",
        border: "1px solid rgba(76, 175, 80, 0.2)",
      };
    }

    if (status === "rejected") {
      return {
        background: "rgba(239, 83, 80, 0.1)",
        color: "#c62828",
        border: "1px solid rgba(239, 83, 80, 0.2)",
      };
    }

    return {
      background: "rgba(255, 193, 7, 0.12)",
      color: "#a16207",
      border: "1px solid rgba(255, 193, 7, 0.24)",
    };
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 20,
          fontFamily: "Roboto, sans-serif",
          color: "#244656",
          fontSize: "14px",
        }}
      >
        Đang tải đánh giá...
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "1px solid #bdd4e0",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(79, 151, 187, 0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid #e6eef3",
            background: "#fff",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 800,
              color: "#244656",
            }}
          >
            Quản lý Đánh giá và Bình luận
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "13px",
              color: "#6d8796",
            }}
          >
            Theo dõi, duyệt, phản hồi và xử lý đánh giá từ khách hàng
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: "1080px",
              borderCollapse: "collapse",
            }}
          >
            <thead
              style={{
                background: "#e2edf4",
              }}
            >
              <tr>
                <th style={thStyle({ width: "220px" })}>Sản phẩm</th>
                <th style={thStyle({ width: "150px" })}>Khách hàng</th>
                <th style={thStyle({ width: "120px", textAlign: "center" })}>
                  Đánh giá
                </th>
                <th style={thStyle({ minWidth: "260px" })}>
                  Nội dung bình luận
                </th>
                <th style={thStyle({ width: "120px", textAlign: "center" })}>
                  Ngày
                </th>
                <th style={thStyle({ width: "150px", textAlign: "center" })}>
                  Trạng thái
                </th>
                <th style={thStyle({ width: "180px", textAlign: "center" })}>
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody>
              {reviews.map((review) => (
                <tr
                  key={review._id}
                  style={{
                    background: review.rating <= 2 ? "#fffafa" : "#fff",
                    borderBottom: "1px solid #edf3f6",
                  }}
                >
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <img
                        src={
                          review.product?.thumbnail ||
                          "https://via.placeholder.com/48"
                        }
                        width="48"
                        height="48"
                        style={{
                          objectFit: "cover",
                          borderRadius: 10,
                          border: "1px solid #d7e5ec",
                          background: "#fff",
                          flexShrink: 0,
                        }}
                        alt=""
                      />

                      <div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#244656",
                            lineHeight: 1.45,
                          }}
                        >
                          {review.product?.name || "Sản phẩm đã bị xóa"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={tdStyle}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#244656",
                      }}
                    >
                      {review.user?.name || "Ẩn danh"}
                    </div>
                  </td>

                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <div>{renderStars(review.rating)}</div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "12px",
                        color: "#6d8796",
                      }}
                    >
                      ({review.rating}/5)
                    </div>
                  </td>

                  <td style={tdStyle}>
                    <p
                      style={{
                        margin: 0,
                        fontStyle: "italic",
                        color: "#425c6b",
                        fontSize: "13px",
                        lineHeight: 1.6,
                      }}
                    >
                      "{review.comment}"
                    </p>

                    {review.adminReply && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "9px 10px",
                          background: "#f7fafc",
                          borderLeft: "3px solid #4f97bb",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#244656",
                          lineHeight: 1.55,
                        }}
                      >
                        <b style={{ color: "#35799d" }}>Phản hồi admin:</b>{" "}
                        {review.adminReply}
                      </div>
                    )}
                  </td>

                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#5f7d8d",
                        fontWeight: 600,
                      }}
                    >
                      {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </td>

                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <select
                      value={review.status}
                      onChange={(e) =>
                        handleChangeStatus(review._id, e.target.value)
                      }
                      style={{
                        ...getStatusStyle(review.status),
                        padding: "6px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        outline: "none",
                        backgroundClip: "padding-box",
                      }}
                    >
                      <option value="pending">Chờ duyệt</option>
                      <option value="approved">Đã duyệt</option>
                      <option value="rejected">Từ chối</option>
                    </select>
                  </td>

                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        gap: "8px",
                        alignItems: "center",
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => openReplyModal(review._id)}
                        style={{
                          background: "#4f97bb",
                          color: "white",
                          border: "1px solid #4f97bb",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 8px 18px rgba(79, 151, 187, 0.14)",
                        }}
                      >
                        Trả lời
                      </button>

                      <button
                        onClick={() => handleDelete(review._id)}
                        style={{
                          background: "#fff",
                          color: "#d64c4c",
                          border: "1px solid rgba(214, 76, 76, 0.28)",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showReplyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(36, 70, 86, 0.28)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
            padding: "16px",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              width: "460px",
              maxWidth: "100%",
              background: "white",
              border: "1px solid #bdd4e0",
              padding: "20px",
              borderRadius: "14px",
              boxShadow: "0 18px 40px rgba(53, 121, 157, 0.16)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
                color: "#244656",
              }}
            >
              Trả lời đánh giá
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                fontSize: "13px",
                color: "#6d8796",
              }}
            >
              Nhập phản hồi để gửi tới khách hàng
            </p>

            <textarea
              placeholder="Nhập nội dung trả lời..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              style={{
                width: "100%",
                height: "120px",
                padding: "10px 12px",
                marginTop: "14px",
                borderRadius: "10px",
                border: "1px solid #bdd4e0",
                fontSize: "13px",
                color: "#244656",
                outline: "none",
                resize: "vertical",
                fontFamily: "Roboto, sans-serif",
                background: "#f7fafc",
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "14px",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setShowReplyModal(false)}
                style={{
                  height: "36px",
                  padding: "0 14px",
                  background: "#fff",
                  color: "#35799d",
                  border: "1px solid #bdd4e0",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>

              <button
                onClick={sendReply}
                style={{
                  height: "36px",
                  padding: "0 14px",
                  background: "#4f97bb",
                  color: "white",
                  border: "1px solid #4f97bb",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 8px 18px rgba(79, 151, 187, 0.14)",
                }}
              >
                Gửi phản hồi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle = (extra = {}) => ({
  padding: "13px 12px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#5f7d8d",
  borderBottom: "1px solid #d7e5ec",
  ...extra,
});

const tdStyle = {
  padding: "13px 12px",
  fontSize: "13px",
  color: "#244656",
  verticalAlign: "middle",
};

export default AdminReviews;
