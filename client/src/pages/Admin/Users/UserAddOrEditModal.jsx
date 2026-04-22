import React, { useState, useEffect } from "react";
import userService from "../../../services/userService";
import { toast } from "react-toastify";

const UserAddOrEditModal = ({
  show,
  handleClose,
  refreshData,
  initialData,
}) => {
  const isEditMode = !!initialData;

  const defaultState = {
    username: "",
    password: "",
    email: "",
    fullName: "",
    phoneNumber: "",
    role: "customer",
    address: "",
  };

  const [formData, setFormData] = useState(defaultState);

  useEffect(() => {
    if (show) {
      if (initialData) {
        setFormData({
          ...defaultState,
          ...initialData,
          password: "",
        });
      } else {
        setFormData(defaultState);
      }
    }
  }, [initialData, show]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.username || !formData.email) {
        toast.error("Vui lòng điền đầy đủ các trường bắt buộc!");
        return;
      }

      if (!isEditMode && !formData.password) {
        toast.error("Vui lòng nhập mật khẩu cho người dùng mới!");
        return;
      }

      const payload = { ...formData };

      if (isEditMode && !payload.password) {
        delete payload.password;
      }

      if (isEditMode) {
        await userService.update(initialData._id, payload);
        toast.success("Cập nhật thành công!");
      } else {
        await userService.create(payload);
        toast.success("Tạo người dùng thành công!");
      }

      refreshData();
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(`Lỗi: ${error.response?.data?.message || error.message}`);
    }
  };

  const showHideClassName = show ? "modal fade show" : "modal fade";
  const displayStyle = show ? { display: "block" } : { display: "none" };

  return (
    <>
      {show && <div className="modal-backdrop fade show user-backdrop"></div>}

      <div
        className={showHideClassName}
        style={displayStyle}
        id="modal-lg"
        tabIndex="-1"
      >
        <div className="user-modal-shell">
          <div className="modal-dialog modal-lg modal-dialog-centered user-modal-dialog">
            <div className="modal-content user-modal">
              <div className="modal-header border-0">
                <div className="user-modal-heading">
                  <h4 className="modal-title user-modal-title mb-1">
                    {isEditMode
                      ? "Cập nhật thông tin User"
                      : "Thêm người dùng mới"}
                  </h4>
                  <p className="user-modal-subtitle mb-0">
                    {isEditMode
                      ? "Chỉnh sửa thông tin tài khoản trong hệ thống"
                      : "Tạo tài khoản mới với đầy đủ thông tin cơ bản"}
                  </p>
                </div>

                <button
                  type="button"
                  className="close user-modal-close"
                  onClick={handleClose}
                  aria-label="Close"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body">
                <form autoComplete="off" className="user-form">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group user-form-group">
                        <label htmlFor="username" className="user-label">
                          Tên đăng nhập <span className="text-danger">*</span>
                        </label>
                        <input
                          id="username"
                          type="text"
                          className="form-control user-input"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          disabled={isEditMode}
                          autoComplete="off"
                          placeholder="Nhập tên đăng nhập"
                        />
                      </div>

                      <div className="form-group user-form-group">
                        <label htmlFor="password" className="user-label">
                          Mật khẩu
                          {isEditMode && (
                            <small className="text-muted ml-2">
                              (Để trống nếu không đổi)
                            </small>
                          )}
                          {!isEditMode && (
                            <span className="text-danger"> *</span>
                          )}
                        </label>
                        <input
                          id="password"
                          type="password"
                          className="form-control user-input"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder={
                            isEditMode
                              ? "Nhập mật khẩu mới..."
                              : "Nhập mật khẩu"
                          }
                          autoComplete="new-password"
                        />
                      </div>

                      <div className="form-group user-form-group">
                        <label htmlFor="email" className="user-label">
                          Email <span className="text-danger">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          className="form-control user-input"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          autoComplete="email"
                          placeholder="example@email.com"
                        />
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-group user-form-group">
                        <label htmlFor="fullName" className="user-label">
                          Họ và tên
                        </label>
                        <input
                          id="fullName"
                          type="text"
                          className="form-control user-input"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          autoComplete="name"
                          placeholder="Nhập họ và tên"
                        />
                      </div>

                      <div className="form-group user-form-group">
                        <label htmlFor="phoneNumber" className="user-label">
                          Số điện thoại
                        </label>
                        <input
                          id="phoneNumber"
                          type="text"
                          className="form-control user-input"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          autoComplete="tel"
                          placeholder="Nhập số điện thoại"
                        />
                      </div>

                      <div className="form-group user-form-group">
                        <label htmlFor="role" className="user-label">
                          Phân quyền
                        </label>
                        <select
                          id="role"
                          className="form-control user-input"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                        >
                          <option value="customer">Khách hàng</option>
                          <option value="staff">Nhân viên</option>
                          <option value="manager">Quản lý</option>
                          <option value="admin">Quản trị viên</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn user-btn-secondary"
                  onClick={handleClose}
                >
                  Đóng
                </button>

                <button
                  type="button"
                  className="btn user-btn-primary"
                  onClick={handleSubmit}
                >
                  {isEditMode ? "Lưu thay đổi" : "Tạo mới"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(:root) {
          --blue-main: #4f97bb;
          --blue-dark: #35799d;
          --blue-light: #c7deea;
          --blue-soft: #e2eef5;
          --blue-bg: #f3f3f3;
          --blue-bg-2: #f7fafc;
          --blue-border: #bdd4e0;
          --blue-hover: #d5e7f0;
          --white: #ffffff;
          --text-dark: #244656;
          --text-light: #f8fafc;
        }

        .user-backdrop {
          background: rgba(36, 70, 86, 0.28);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        }

        .user-modal-shell {
          position: fixed;
          inset: 0;
          z-index: 1055;
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .user-modal-shell {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .user-modal {
          font-family: "Roboto", sans-serif;
          border: 1px solid var(--blue-border);
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(53, 121, 157, 0.16);
          background: var(--white);
          overflow: hidden;
        }

        .user-modal-heading {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .user-modal-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--text-dark);
          line-height: 1.2;
        }

        .user-modal-subtitle {
          font-size: 0.88rem;
          color: #6d8796;
          line-height: 1.45;
          margin-top: 2px;
        }

        .user-modal-close {
          width: 36px;
          height: 36px;
          border: 1px solid var(--blue-border);
          border-radius: 8px;
          background: var(--blue-soft);
          color: var(--blue-dark);
          opacity: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.05rem;
          transition: all 0.2s ease;
          box-shadow: none;
          flex-shrink: 0;
        }

        .user-modal-close:hover {
          background: var(--blue-hover);
          color: var(--text-dark);
          border-color: var(--blue-main);
        }

        .user-form {
          width: 100%;
        }

        .user-form-group {
          margin-bottom: 1rem;
        }

        .user-label {
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 0.42rem;
          display: inline-block;
          font-size: 0.9rem;
        }

        .user-input {
          font-family: "Roboto", sans-serif;
          min-height: 38px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid var(--blue-border);
          background: var(--blue-bg-2);
          color: var(--text-dark);
          box-shadow: none !important;
          transition: all 0.2s ease;
          padding: 0.5rem 0.8rem;
          font-size: 0.9rem;
        }

        .user-input::placeholder {
          color: #90a5b1;
        }

        .user-input:focus {
          border-color: var(--blue-main);
          background: var(--white);
          box-shadow: 0 0 0 0.2rem rgba(79, 151, 187, 0.14) !important;
        }

        .user-input:disabled {
          background: #eef4f7;
          color: #6e8795;
          cursor: not-allowed;
        }

        .user-btn-primary,
        .user-btn-secondary {
          border-radius: 8px;
          min-width: 98px;
          height: 36px;
          padding: 0 14px;
          font-size: 0.88rem;
          font-weight: 700;
          font-family: "Roboto", sans-serif;
          margin: 0 !important;
          transition:
            border-color 0.2s,
            background-color 0.18s,
            transform 0.12s,
            box-shadow 0.18s;
        }

        .user-btn-primary {
          background-color: var(--blue-main);
          border: 1px solid rgba(53, 121, 157, 0.14);
          color: var(--white);
          box-shadow: 0 8px 18px rgba(79, 151, 187, 0.14);
        }

        .user-btn-primary:hover {
          border-color: var(--blue-dark);
          background-color: var(--blue-dark);
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(79, 151, 187, 0.18);
          color: var(--white);
        }

        .user-btn-secondary {
          background: var(--white);
          border: 1px solid var(--blue-border);
          color: var(--blue-dark);
          box-shadow: 0 6px 14px rgba(79, 151, 187, 0.06);
        }

        .user-btn-secondary:hover {
          background: var(--blue-soft);
          border-color: var(--blue-main);
          color: var(--text-dark);
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(79, 151, 187, 0.1);
        }

        .modal-header,
        .modal-body,
        .modal-footer {
          padding-left: 18px;
          padding-right: 18px;
        }

        .modal-header {
          padding-top: 18px;
          padding-bottom: 10px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          border-bottom: 1px solid #e6eef3;
          background: #f7fafc;
        }

        .modal-body {
          padding-top: 14px;
          padding-bottom: 4px;
        }

        .modal-body .row {
          display: flex;
          flex-wrap: wrap;
          margin-left: -8px;
          margin-right: -8px;
        }

        .modal-body .col-md-6 {
          padding-left: 8px;
          padding-right: 8px;
        }

        .modal-footer {
          padding-top: 10px;
          padding-bottom: 16px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          border-top: 1px solid #e6eef3;
          background: #fff;
        }

        @media (max-width: 768px) {
          .user-modal-shell {
            padding: 12px;
            align-items: center;
          }

          .user-modal-dialog {
            max-width: 100%;
            margin: 0 auto !important;
          }

          .user-modal {
            border-radius: 14px;
          }

          .user-modal-title {
            font-size: 1.05rem;
          }

          .user-modal-subtitle {
            font-size: 0.84rem;
          }

          .modal-header,
          .modal-body,
          .modal-footer {
            padding-left: 14px;
            padding-right: 14px;
          }

          .modal-body {
            padding-top: 12px;
          }

          .modal-footer {
            gap: 8px;
          }

          .modal-footer .btn {
            width: 100%;
          }

          .user-btn-primary,
          .user-btn-secondary {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default UserAddOrEditModal;
