import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminReviews = () => {

    const [reviews, setReviews] = useState([]);
    const [reply, setReply] = useState({});

    // load reviews
    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/reviews");
            setReviews(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // duyệt review
    const approve = async (id) => {
        try {
            await axios.put(`http://localhost:5000/api/reviews/${id}/approve`);
            fetchReviews();
        } catch (err) {
            console.error(err);
        }
    };

    // từ chối review
    const reject = async (id) => {
        try {
            await axios.put(`http://localhost:5000/api/reviews/${id}/reject`);
            fetchReviews();
        } catch (err) {
            console.error(err);
        }
    };

    // admin reply
    const sendReply = async (id) => {
        try {
            await axios.put(
                `http://localhost:5000/api/reviews/${id}/reply`,
                { reply: reply[id] }
            );

            setReply({ ...reply, [id]: "" });
            fetchReviews();

        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ padding: "20px" }}>

            <h2>Quản lý đánh giá</h2>

            {reviews.map((r) => (
                <div
                    key={r._id}
                    style={{
                        border: "1px solid #ccc",
                        padding: "10px",
                        marginBottom: "10px",
                        borderRadius: "6px"
                    }}
                >

                    <p><b>Product:</b> {r.product?.name}</p>

                    <p><b>User:</b> {r.user?.name}</p>

                    <p><b>Rating:</b> ⭐ {r.rating}</p>

                    <p>{r.comment}</p>

                    <p><b>Status:</b> {r.status}</p>

                    {r.adminReply && (
                        <p style={{ color: "green" }}>
                            <b>Admin:</b> {r.adminReply}
                        </p>
                    )}

                    <button onClick={() => approve(r._id)}>
                        Duyệt
                    </button>

                    <button
                        onClick={() => reject(r._id)}
                        style={{ marginLeft: "10px" }}
                    >
                        Từ chối
                    </button>

                    <div style={{ marginTop: "10px" }}>
                        <input
                            placeholder="Phản hồi..."
                            value={reply[r._id] || ""}
                            onChange={(e) =>
                                setReply({
                                    ...reply,
                                    [r._id]: e.target.value
                                })
                            }
                            style={{ marginRight: "10px" }}
                        />

                        <button onClick={() => sendReply(r._id)}>
                            Trả lời
                        </button>
                    </div>

                </div>
            ))}

        </div>
    );
};

export default AdminReviews;