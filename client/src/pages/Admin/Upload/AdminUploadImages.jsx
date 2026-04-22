import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { uploadToCloudinary } from "../../../services/cloudinaryService";
import "./uploadAdmin.css";

const AdminUploadImages = () => {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/upload");
      if (response.ok) {
        const data = await response.json();
        const list = data.data || [];
        const norm = (list || []).map((it) => ({
          _id: it._id || it.imageId,
          url: it.imagePath || it.url,
          fileName:
            it.originalName ||
            it.filename ||
            (it.url ? it.url.split("/").slice(-1)[0] : ""),
          uploadedAt: it.uploadedAt || it.createdAt || new Date(),
          size: it.fileSize || it.size || 0,
        }));

        setUploadedImages(norm);
      }
    } catch (err) {
      console.warn("Lỗi tải danh sách ảnh từ server:", err);
      setUploadedImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    setUploading(true);

    try {
      const uploadedList = [];

      for (const file of fileList) {
        try {
          const result = await uploadToCloudinary(file);

          try {
            const saveRes = await fetch(
              "http://localhost:5000/api/upload/cloud",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: result.url,
                  publicId: result.publicId,
                  originalName: file.name,
                  size: result.size,
                  mimeType: file.type,
                }),
              },
            );

            if (saveRes.ok) {
              const saved = await saveRes.json();
              const it = saved.data || saved;

              uploadedList.push({
                _id: it._id || it.imageId || result.publicId,
                url: it.imagePath || result.url,
                fileName: it.originalName || file.name,
                uploadedAt: it.uploadedAt || new Date(),
                size: it.fileSize || result.size,
              });
            } else {
              uploadedList.push({
                _id: result.publicId,
                url: result.url,
                fileName: file.name,
                size: result.size,
                width: result.width,
                height: result.height,
                uploadedAt: new Date(),
              });
            }
          } catch (e2) {
            console.error("Lỗi lưu vào server:", e2);
            uploadedList.push({
              _id: result.publicId,
              url: result.url,
              fileName: file.name,
              size: result.size,
              width: result.width,
              height: result.height,
              uploadedAt: new Date(),
            });
          }
        } catch (err) {
          console.error(`Lỗi upload ảnh ${file.name}:`, err);
        }
      }

      if (uploadedList.length > 0) {
        setUploadedImages((prev) => [...uploadedList, ...prev]);

        if (uploadedList.length === fileList.length) {
          toast.success(`Upload thành công ${uploadedList.length} ảnh!`);
        } else {
          toast.warning(
            `Upload thành công ${uploadedList.length}/${fileList.length} ảnh!`,
          );
        }
      } else {
        toast.error("Không upload được ảnh nào!");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleCopyPath = (path) => {
    const fullPath = path.startsWith("http")
      ? path
      : `http://localhost:5000${path}`;
    navigator.clipboard.writeText(fullPath);
    toast.success("Đã copy đường dẫn!");
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa ảnh này?")) return;

    try {
      const response = await fetch(`http://localhost:5000/api/upload/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Đã xóa ảnh!");
        fetchImages();
      } else {
        toast.warning("Ảnh đã bị xóa khỏi danh sách");
        fetchImages();
      }
    } catch (err) {
      console.error("Lỗi:", err);
      toast.error("Lỗi khi xóa ảnh!");
    }
  };

  if (loading) {
    return <div className="upload-loading">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="upload-container">
      <div className="upload-head">
        <div>
          <h2>Quản lý upload ảnh</h2>
          <p className="upload-subtitle">
            Tải ảnh lên kho lưu trữ, sao chép đường dẫn và quản lý danh sách ảnh
            đã upload.
          </p>
        </div>
      </div>

      <div
        className={`drop-zone ${dragActive ? "active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          disabled={uploading}
          style={{ display: "none" }}
        />

        <div className="drop-content">
          <i className="fas fa-cloud-upload-alt upload-icon"></i>
          <p className="drop-title">Kéo ảnh vào đây hoặc</p>
          <button
            className="browse-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            type="button"
          >
            <i
              className={`fas ${uploading ? "fa-spinner fa-spin" : "fa-upload"}`}
            ></i>
            <span>{uploading ? "Đang upload..." : "Chọn tệp"}</span>
          </button>
          <p className="drop-info">JPG, PNG, WEBP (tối đa 5MB)</p>
        </div>
      </div>

      <div className="images-list">
        <div className="images-head">
          <h3>Ảnh đã upload</h3>
          <div className="images-count">{uploadedImages.length} ảnh</div>
        </div>

        {uploadedImages.length === 0 ? (
          <p className="empty-message">Chưa có ảnh nào</p>
        ) : (
          <div className="images-grid">
            {uploadedImages.map((img) => (
              <div key={img._id} className="image-card">
                <div className="image-preview">
                  <img src={img.url} alt={img.fileName} />
                </div>

                <div className="image-info">
                  <p className="image-name" title={img.fileName}>
                    {img.fileName}
                  </p>

                  <p className="image-date">
                    {new Date(img.uploadedAt).toLocaleString("vi-VN")}
                  </p>

                  <div className="image-path-container">
                    <input
                      type="text"
                      className="image-path"
                      value={img.url}
                      readOnly={true}
                    />
                    <button
                      className="copy-btn"
                      onClick={() => handleCopyPath(img.url)}
                      title="Copy đường dẫn"
                      type="button"
                    >
                      <i className="fas fa-copy"></i>
                    </button>
                  </div>
                </div>

                <button
                  className="delete-btn"
                  onClick={() => handleDeleteImage(img._id)}
                  title="Xóa ảnh"
                  type="button"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUploadImages;
