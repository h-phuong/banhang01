import React, { useEffect, useState } from "react";
import axios from "axios";
import "./FeedBackList.css";

const API_BASE = "http://localhost:5000/api";

export default function FeedBackList({ productId, limit = 8 }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const getImageUrl = (review) => {
    const raw =
      review?.product?.images?.[0]?.imageUrl ||
      review?.product?.thumbnail ||
      review?.product?.image ||
      "";

    if (!raw) return "https://placehold.co/200x120";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("/")) return `http://localhost:5000${raw}`;
    return `http://localhost:5000/${raw}`;
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);

      let res;

      if (productId) {
        res = await axios.get(`${API_BASE}/reviews/product/${productId}`);
      } else {
        res = await axios.get(`${API_BASE}/reviews`);
      }

      const rawData = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.reviews)
          ? res.data.reviews
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];

      const approvedReviews = rawData.filter(
        (item) =>
          String(item?.status || "approved").toLowerCase() === "approved",
      );

      setReviews(productId ? approvedReviews : approvedReviews.slice(0, limit));
    } catch (err) {
      console.log("FETCH REVIEWS ERROR:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId, limit]);

  const renderStars = (num) => {
    const rating = Number(num || 0);
    const safeRating = Math.max(0, Math.min(5, rating));
    return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
  };

  return (
    <div className="feedback-wrapper">
      {loading ? (
        <div className="feedback-empty">Đang tải đánh giá...</div>
      ) : reviews.length === 0 ? (
        <div className="feedback-empty">
          Chưa có đánh giá nào được hiển thị.
        </div>
      ) : (
        <div className="feedback-slider">
          {reviews.map((r) => {
            const img = getImageUrl(r);

            return (
              <div key={r._id} className="feedback-card">
                <img
                  src={img}
                  className="feedback-img"
                  alt={r.product?.name || "product"}
                  onError={(e) => {
                    e.currentTarget.src = "https://placehold.co/200x120";
                  }}
                />

                <div className="feedback-content">
                  <b className="feedback-title">
                    {r.product?.name || "Sản phẩm"}
                  </b>

                  <div className="feedback-stars">{renderStars(r.rating)}</div>

                  <p className="feedback-comment">{r.comment}</p>

                  <div className="feedback-user">
                    {r.user?.fullName ||
                      r.user?.name ||
                      r.guestName ||
                      "Ẩn danh"}
                  </div>

                  {r.orderCode ? (
                    <div className="feedback-order">
                      Đơn hàng: {r.orderCode}
                    </div>
                  ) : null}

                  {r.adminReply ? (
                    <div className="feedback-reply">
                      <b>Shop:</b> {r.adminReply}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
