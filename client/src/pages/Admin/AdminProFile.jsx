import React, { useState } from "react";
import "./AdminProfile.css";

const AdminProFile = () => {
  const [admin, setAdmin] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");

      return savedUser
        ? JSON.parse(savedUser)
        : {
            _id: "",
            username: "",
            email: "",
            fullName: "",
            phoneNumber: "",
            role: "",
          };
    } catch {
      return {
        _id: "",
        username: "",
        email: "",
        fullName: "",
        phoneNumber: "",
        role: "",
      };
    }
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const API_URL = "http://localhost:5000/api/users/";

  const handleChange = (e) => {
    setAdmin({
      ...admin,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(API_URL + admin._id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: admin.username,
          fullName: admin.fullName,
          phoneNumber: admin.phoneNumber,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAdmin(data);
        localStorage.setItem("user", JSON.stringify(data));

        alert("Cập nhật thành công");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Mật khẩu mới không khớp");
      return;
    }

    try {
      const res = await fetch(API_URL + "change-password/" + admin._id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Đổi mật khẩu thành công");

        setPasswordData({
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        });

        setShowPasswordModal(false);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="profile-page">
      <h2 className="profile-title">Thông tin Admin</h2>

      <div className="profile-card">
        {/* LEFT */}
        <div className="profile-left">
          <img
            src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
            alt="avatar"
            className="avatar"
          />

          <h5>{admin.fullName}</h5>

          <div className="role-badge">{admin.role}</div>
        </div>

        {/* RIGHT */}
        <div className="profile-right">
          {/* ROW 1 */}
          <div className="form-row">
            <div className="form-group">
              <label>Tên đăng nhập</label>

              <input
                type="text"
                name="username"
                value={admin.username || ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Họ và tên</label>

              <input
                type="text"
                name="fullName"
                value={admin.fullName || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* ROW 2 */}
          <div className="form-row">
            <div className="form-group">
              <label>Số điện thoại</label>

              <input
                type="text"
                name="phoneNumber"
                value={admin.phoneNumber || ""}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Email</label>

              <input type="email" value={admin.email || ""} disabled />
            </div>
          </div>

          {/* ROW 3 */}
          <div className="form-group full-width">
            <label>Vai trò</label>

            <input type="text" value={admin.role || ""} disabled />
          </div>

          <div className="button-group">
            <button className="admin-btn" onClick={handleUpdate}>
              Cập nhật thông tin
            </button>

            <button
              className="admin-btn"
              onClick={() => setShowPasswordModal(true)}
            >
              Thay đổi mật khẩu
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CHANGE PASSWORD */}

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Thay đổi mật khẩu</h3>

              <button
                className="modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Mật khẩu cũ</label>

                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      oldPassword: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu mới</label>

                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Nhập lại mật khẩu mới</label>

                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="admin-btn-outline"
                onClick={() => setShowPasswordModal(false)}
              >
                Hủy
              </button>

              <button className="admin-btn" onClick={handleChangePassword}>
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProFile;
