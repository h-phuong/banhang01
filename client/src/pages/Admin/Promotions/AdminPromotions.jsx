// components/AdminPromotions.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";

const AdminPromotions = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const initialFormState = {
    name: "",
    code: "",
    type: "percent",
    isFlashSale: false,
    discountValue: 0,
    minOrderValue: 0,
    limit: 100,
    startDate: "",
    endDate: "",
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/coupons");
        setCoupons(res.data);
        setLoading(false);
      } catch {
        toast.error("Không thể tải danh sách mã");
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:5000/api/coupons",
        formData,
      );
      toast.success("Tạo mã thành công!");
      setCoupons([res.data, ...coupons]);
      setShowModal(false);
      setFormData(initialFormState);
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo mã");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn chắc chắn muốn xóa mã này?")) {
      try {
        await axios.delete(`http://localhost:5000/api/coupons/${id}`);
        setCoupons(coupons.filter((c) => c._id !== id));
        toast.success("Đã xóa mã!");
      } catch {
        toast.error("Lỗi khi xóa");
      }
    }
  };

  const safeDate = (dateString) => {
    if (!dateString) return "---";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "---"
      : date.toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        });
  };

  const getTypeLabel = (type) => {
    const types = {
      percent: "Giảm %",
      fixed: "Giảm tiền",
    };
    return types[type] || "Khác";
  };

  return (
    <div className="apm-page">
      <style>{`
        .apm-page {
          padding: 20px;
          min-height: 100vh;
          background: #f3f3f3;
          font-family: "Roboto", sans-serif;
          color: #244656;
        }

        .apm-head {
          margin-bottom: 18px;
        }

        .apm-title {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #35799d;
        }

        .apm-subtitle {
          margin: 6px 0 0;
          color: #6d8796;
          font-size: 14px;
          line-height: 1.5;
        }

        .apm-card {
          background: #fff;
          border: 1px solid #bdd4e0;
          border-radius: 18px;
          box-shadow: 0 3px 10px rgba(79, 151, 187, 0.06);
          overflow: hidden;
        }

        .apm-card-header {
          background: #fff;
          padding: 16px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #e6eef3;
          flex-wrap: wrap;
        }

        .apm-card-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .apm-card-icon {
          font-size: 15px;
          color: #35799d;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .apm-card-title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: #244656;
        }

        .apm-card-body {
          padding: 0;
        }

        .apm-btn {
          min-height: 38px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid transparent;
          font-family: "Roboto", sans-serif;
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.18s ease;
          white-space: nowrap;
        }

        .apm-btn:hover {
          transform: translateY(-1px);
        }

        .apm-btn-primary {
          background: #4f97bb;
          border-color: #4f97bb;
          color: #fff;
          box-shadow: none;
        }

        .apm-btn-primary:hover {
          background: #35799d;
          border-color: #35799d;
        }

        .apm-btn-ghost {
          background: #fff;
          border-color: #bdd4e0;
          color: #35799d;
        }

        .apm-btn-ghost:hover {
          background: #e2eef5;
          border-color: #4f97bb;
          color: #244656;
        }

        .apm-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .apm-table {
          width: 100%;
          min-width: 980px;
          border-collapse: collapse;
          background: #fff;
        }

        .apm-table thead th {
          background: #e2edf4;
          color: #5f7d8d;
          font-size: 12px;
          font-weight: 800;
          padding: 13px 12px;
          border-bottom: 1px solid #d7e5ec;
          white-space: nowrap;
          text-align: left;
        }

        .apm-table td {
          padding: 12px;
          border-bottom: 1px solid #edf3f6;
          font-size: 13px;
          color: #244656;
          vertical-align: middle;
          background: #fff;
          transition: background 0.18s ease;
        }

        .apm-table tbody tr:hover td {
          background: rgba(79, 151, 187, 0.05);
        }

        .apm-th-main {
          padding-left: 18px !important;
        }

        .apm-coupon-name {
          font-weight: 800;
          color: #244656;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .apm-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
          padding: 0 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          border: 1px solid transparent;
          line-height: 1;
        }

        .apm-badge-flash {
          background: rgba(250, 189, 50, 0.18);
          color: #9b6a00;
          border-color: rgba(250, 189, 50, 0.3);
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .apm-badge-type {
          background: rgba(30, 69, 159, 0.1);
          color: #1e459f;
          border-color: rgba(30, 69, 159, 0.22);
        }

        .apm-code-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 92px;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px dashed #bdd4e0;
          background: #f7fafc;
          text-align: center;
          font-family: "Roboto", sans-serif;
          letter-spacing: 0.8px;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
        }

        .apm-discount {
          font-weight: 800;
          color: #cf2a2a;
        }

        .apm-small {
          font-size: 13px;
        }

        .apm-muted-mini {
          color: #7a95a4;
          font-size: 11px;
          font-weight: 400;
          margin-top: 4px;
        }

        .apm-date-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          white-space: nowrap;
        }

        .apm-date-start {
          color: #0c6b37;
        }

        .apm-date-end {
          color: #7a95a4;
        }

        .apm-center {
          text-align: center;
        }

        .apm-delete-btn {
          border: none;
          background: transparent;
          color: #cf2a2a;
          cursor: pointer;
          font-size: 15px;
          padding: 0;
        }

        .apm-delete-btn:hover {
          opacity: 0.8;
        }

        .apm-empty {
          text-align: center;
          padding: 24px;
          color: #7a95a4;
          font-size: 13px;
        }

        .apm-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(36, 70, 86, 0.45);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 16px;
        }

        .apm-modal {
          background: #fff;
          border: 1px solid #bdd4e0;
          border-radius: 18px;
          box-shadow: 0 10px 28px rgba(53, 121, 157, 0.12);
          width: 600px;
          max-width: 95%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .apm-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          border-bottom: 1px solid #e6eef3;
          background: #f7fafc;
        }

        .apm-modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: #35799d;
        }

        .apm-close-btn {
          border: none;
          background: transparent;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          color: #5f7d8d;
        }

        .apm-form {
          padding: 18px;
        }

        .apm-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .apm-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
        }

        .apm-field label {
          font-size: 13px;
          font-weight: 700;
          color: #5f7d8d;
        }

        .apm-field input,
        .apm-field select {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid #bdd4e0;
          border-radius: 12px;
          outline: none;
          background: #fff;
          color: #244656;
          font-size: 13px;
          font-family: "Roboto", sans-serif;
          box-sizing: border-box;
        }

        .apm-field input:focus,
        .apm-field select:focus {
          border-color: #4f97bb;
          box-shadow: 0 0 0 0.2rem rgba(79, 151, 187, 0.14);
        }

        .apm-uppercase {
          text-transform: uppercase;
          font-weight: 700;
        }

        .apm-check {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          font-size: 13px;
          font-weight: 700;
          color: #cf2a2a;
        }

        .apm-check input {
          width: 16px;
          height: 16px;
          accent-color: #35799d;
        }

        .apm-input-group {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0;
          align-items: center;
        }

        .apm-input-group input {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }

        .apm-input-suffix {
          height: 40px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #bdd4e0;
          border-left: none;
          border-top-right-radius: 12px;
          border-bottom-right-radius: 12px;
          background: #f7fafc;
          color: #5f7d8d;
          font-size: 13px;
          font-weight: 700;
        }

        .apm-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #e6eef3;
          flex-wrap: wrap;
        }

        @media (max-width: 820px) {
          .apm-row {
            grid-template-columns: 1fr;
          }

          .apm-table {
            min-width: 760px;
          }
        }

        @media (max-width: 576px) {
          .apm-page {
            padding: 16px;
          }

          .apm-title {
            font-size: 22px;
          }

          .apm-subtitle {
            font-size: 13px;
          }

          .apm-modal {
            border-radius: 14px;
          }

          .apm-modal-header,
          .apm-form {
            padding-left: 14px;
            padding-right: 14px;
          }

          .apm-btn {
            min-height: 38px;
            font-size: 12px;
            padding: 0 12px;
          }
        }
      `}</style>

      <div className="apm-head">
        <div>
          <h2 className="apm-title">Quản lý khuyến mãi</h2>
          <p className="apm-subtitle">
            Theo dõi mã giảm giá, chương trình flash sale và thời gian áp dụng.
          </p>
        </div>
      </div>

      <div className="apm-card">
        <div className="apm-card-header">
          <div className="apm-card-title-wrap">
            <i className="fas fa-tags apm-card-icon"></i>
            <h6 className="apm-card-title">Danh sách mã giảm giá</h6>
          </div>

          <button
            className="apm-btn apm-btn-primary"
            onClick={() => setShowModal(true)}
          >
            + Tạo mới
          </button>
        </div>

        <div className="apm-card-body">
          <div className="apm-table-wrap">
            <table className="apm-table">
              <thead>
                <tr>
                  <th className="apm-th-main">Tên / Loại mã</th>
                  <th>Mã code</th>
                  <th>Giảm giá</th>
                  <th>Số lượng còn lại</th>
                  <th>Đơn tối thiểu</th>
                  <th>Thời gian</th>
                  <th className="apm-center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="apm-empty">
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : coupons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="apm-empty">
                      Chưa có mã giảm giá nào.
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => (
                    <tr key={c._id}>
                      <td className="apm-th-main">
                        <div className="apm-coupon-name">
                          {c.name}
                          {c.isFlashSale && (
                            <span className="apm-badge apm-badge-flash">
                              <i className="fas fa-bolt"></i>
                              <span>Flash Sale</span>
                            </span>
                          )}
                        </div>

                        <span className="apm-badge apm-badge-type">
                          {getTypeLabel(c.type)}
                        </span>
                      </td>

                      <td>
                        <div className="apm-code-box">{c.code}</div>
                      </td>

                      <td className="apm-discount">
                        {c.type === "percent"
                          ? `-${c.discountValue}%`
                          : `-${c.discountValue?.toLocaleString()}đ`}
                      </td>

                      <td className="apm-small">
                        {typeof c.remaining === "number"
                          ? c.remaining
                          : Math.max(
                              0,
                              (c.limit || 0) - (c.usedBy?.length || 0),
                            )}
                        / {c.limit || 0}
                        <div className="apm-muted-mini">
                          Đã dùng: {c.usedBy?.length || 0}
                        </div>
                      </td>

                      <td className="apm-small">
                        {c.minOrderValue?.toLocaleString()}đ
                      </td>

                      <td>
                        <div className="apm-date-list">
                          <span className="apm-date-start">
                            {safeDate(c.startDate)}
                          </span>
                          <span className="apm-date-end">
                            {safeDate(c.endDate)}
                          </span>
                        </div>
                      </td>

                      <td className="apm-center">
                        <button
                          className="apm-delete-btn"
                          onClick={() => handleDelete(c._id)}
                          title="Xóa mã"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="apm-modal-backdrop">
          <div className="apm-modal">
            <div className="apm-modal-header">
              <h5 className="apm-modal-title">Thêm mã mới</h5>
              <button
                onClick={() => setShowModal(false)}
                className="apm-close-btn"
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="apm-form">
              <div className="apm-field">
                <label>Tên chương trình</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="VD: Khai xuân rực rỡ"
                />
              </div>

              <div className="apm-row">
                <div className="apm-field">
                  <label>Mã code</label>
                  <input
                    type="text"
                    name="code"
                    required
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="XUAN2024"
                    className="apm-uppercase"
                  />
                </div>

                <div className="apm-field">
                  <label>Hình thức giảm</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                  >
                    <option value="percent">Giảm theo %</option>
                    <option value="fixed">Giảm theo tiền cố định</option>
                  </select>
                </div>
              </div>

              <label className="apm-check">
                <input
                  type="checkbox"
                  id="isFlashSale"
                  name="isFlashSale"
                  checked={formData.isFlashSale}
                  onChange={handleInputChange}
                />
                <span>⚡ Đây là mã khung giờ vàng (Flash Sale)</span>
              </label>

              <div className="apm-row">
                <div className="apm-field">
                  <label>Giá trị giảm</label>
                  <div className="apm-input-group">
                    <input
                      type="number"
                      name="discountValue"
                      required
                      value={formData.discountValue}
                      onChange={handleInputChange}
                      placeholder="Nhập số"
                    />
                    <span className="apm-input-suffix">
                      {formData.type === "percent" ? "%" : "đ"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="apm-row">
                <div className="apm-field">
                  <label>Đơn tối thiểu (đ)</label>
                  <input
                    type="number"
                    name="minOrderValue"
                    value={formData.minOrderValue}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="apm-field">
                  <label>Số lượng tối đa</label>
                  <input
                    type="number"
                    name="limit"
                    value={formData.limit}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="apm-row">
                <div className="apm-field">
                  <label>Từ ngày giờ</label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    required
                    value={formData.startDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="apm-field">
                  <label>Đến ngày giờ</label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    required
                    value={formData.endDate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="apm-form-actions">
                <button
                  type="button"
                  className="apm-btn apm-btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="apm-btn apm-btn-primary">
                  Lưu mã
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromotions;
