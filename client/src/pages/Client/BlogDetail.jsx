import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import "./BlogDetail.css";

const API_BASE = "http://localhost:5000";

export default function BlogDetail() {
  const { slug } = useParams();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const fetchPost = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/posts/${slug}`);
        const data = await res.json();

        if (!res.ok) {
          setPost(null);
          return;
        }

        setPost(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return <div className="blog-detail-loading">Đang tải bài viết...</div>;
  }

  if (!post) {
    return <div className="blog-detail-loading">Không tìm thấy bài viết</div>;
  }

  return (
    <div className="blog-detail">
      <div className="blog-detail-container">
        <div className="blog-detail-head">
          <div className="blog-detail-kicker">LOCALBRAND BLOG</div>

          <h1 className="blog-detail-title">{post.title}</h1>

          <div className="blog-detail-meta">
            <span>
              <i className="far fa-calendar"></i>
              {post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString("vi-VN")
                : ""}
            </span>

            <span>
              <i className="fas fa-eye"></i>
              {post.views || 0} lượt xem
            </span>
          </div>
        </div>

        {post.thumbnail && (
          <div className="blog-detail-thumbnail">
            <img src={post.thumbnail} alt={post.title} />
          </div>
        )}

        {post.summary && <p className="blog-detail-summary">{post.summary}</p>}

        <div
          className="blog-detail-content"
          dangerouslySetInnerHTML={{
            __html: (post.content || "").replace(/\n/g, "<br/>"),
          }}
        />
      </div>
    </div>
  );
}
