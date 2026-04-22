import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { uploadToCloudinary } from "../services/cloudinaryService";

const ImageUploadInput = ({ onImageUpload, value = "" }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState(value);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryImages, setLibraryImages] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch danh sách ảnh từ thư viện
  useEffect(() => {
    if (showLibrary) {
      fetchLibraryImages();
    }
  }, [showLibrary]);

  const fetchLibraryImages = async () => {
    setLoadingLibrary(true);
    try {
      // For Cloudinary, we can fetch from your server's database of uploaded images
      // Or show a simplified message that Cloudinary handles image storage
      toast.info("Thư viện ảnh được quản lý tự động bằng Cloudinary!");
      setLoadingLibrary(false);
    } catch (err) {
      console.error("Lỗi tải thư viện ảnh:", err);
      toast.error("Lỗi tải thư viện ảnh!");
      setLoadingLibrary(false);
    }
  };

  const handleSelectFromLibrary = (imageUrl) => {
    setImagePreview(imageUrl);
    onImageUpload(imageUrl);
    setShowLibrary(false);
    toast.success("Đã chọn ảnh!");
  };

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(files[0]);

      // Update preview and call callback with Cloudinary URL
      setImagePreview(result.url);
      onImageUpload(result.url);
      toast.success("Upload ảnh thành công!");
    } catch (err) {
      console.error("Lỗi:", err);
      toast.error(err.message || "Lỗi khi upload ảnh!");
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

  const handleClearImage = () => {
    setImagePreview("");
    onImageUpload("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ marginBottom: "12px" }}>
      <label
        style={{
          fontWeight: "bold",
          display: "block",
          marginBottom: "6px",
          fontSize: "13px",
        }}
      >
        Ảnh sản phẩm
      </label>

      {imagePreview ? (
        <div
          style={{
            position: "relative",
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "10px",
          }}
        >
          <img
            src={imagePreview}
            alt="preview"
            style={{
              width: "100%",
              height: "140px",
              objectFit: "cover",
              borderRadius: "8px",
              border: "2px solid #ddd",
            }}
          />
          <button
            type="button"
            onClick={handleClearImage}
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "rgba(239, 68, 68, 0.9)",
              color: "white",
              border: "none",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) =>
              (e.target.style.background = "rgba(239, 68, 68, 1)")
            }
            onMouseLeave={(e) =>
              (e.target.style.background = "rgba(239, 68, 68, 0.9)")
            }
          >
            ✕
          </button>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <button
          type="button"
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            flex: 1,
            background: "#4338ca",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: "6px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "12px",
            fontWeight: "600",
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? "⏳" : "📤 Upload"}
        </button>
        <button
          type="button"
          onClick={() => setShowLibrary(!showLibrary)}
          style={{
            flex: 1,
            background: "#06b6d4",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          {showLibrary ? "✕" : "📚 Thư viện"}
        </button>
      </div>

      {/* Library Modal */}
      {showLibrary && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "800px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0 }}>Thư viện ảnh</h3>
              <button
                type="button"
                onClick={() => setShowLibrary(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  padding: 0,
                  color: "#666",
                }}
              >
                ✕
              </button>
            </div>

            {loadingLibrary ? (
              <p style={{ textAlign: "center", color: "#666" }}>Đang tải...</p>
            ) : libraryImages.length === 0 ? (
              <p style={{ textAlign: "center", color: "#666" }}>
                Chưa có ảnh nào
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: "12px",
                }}
              >
                {libraryImages.map((img) => (
                  <div
                    key={img._id}
                    onClick={() => handleSelectFromLibrary(img.imagePath)}
                    style={{
                      cursor: "pointer",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "2px solid #e5e7eb",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#4338ca";
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(67, 56, 202, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <img
                      src={img.imagePath.startsWith('http') ? img.imagePath : `http://localhost:5000${img.imagePath}`}
                      alt={img.originalName}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress {
          0% { width: 0; }
          50% { width: 100%; }
          100% { width: 0; }
        }
      `}</style>
    </div>
  );
};
export default ImageUploadInput;
