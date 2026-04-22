import React, { useEffect, useMemo, useState } from "react";
import userService from "../../../services/userService";
import UserAddOrEditModal from "./UserAddOrEditModal";
import { toast } from "react-toastify";
import Pagination from "../../../components/Pagination";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const LIMIT = 10;

  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const normalizeRoleValue = (role) => {
    if (!role) return "";
    const value = String(role).toLowerCase();

    if (value === "admin") return "admin";
    if (value === "manager") return "manager";
    if (value === "staff") return "staff";
    if (value === "customer") return "customer";

    return value;
  };

  const getRoleLabel = (role) => {
    const normalized = normalizeRoleValue(role);

    if (normalized === "admin") return "Quản trị viên";
    if (normalized === "manager") return "Quản lý";
    if (normalized === "staff") return "Nhân viên";
    return "Khách hàng";
  };

  const fetchUsers = async (page = currentPage) => {
    setLoading(true);
    try {
      const data = await userService.getAll(
        page,
        LIMIT,
        searchText,
        filterRole,
        filterStatus,
      );

      if (data?.docs) {
        setUsers(data.docs);
        setTotalPages(data.totalPages || 0);
        setCurrentPage(data.page || 1);
      } else {
        setUsers([]);
        setTotalPages(0);
      }
    } catch (error) {
      console.error("Lỗi tải users:", error);
      toast.error("Không tải được dữ liệu người dùng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, filterRole, filterStatus]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleFilter = () => {
    setCurrentPage(1);
    fetchUsers(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleFilter();
    }
  };

  const handleCreateClick = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleToggleLockClick = async (id, isLocked) => {
    const confirmMessage = isLocked
      ? "Bạn có muốn mở khóa tài khoản này không?"
      : "Bạn có chắc muốn khóa tài khoản này không? Người dùng sẽ không thể đăng nhập.";

    if (window.confirm(confirmMessage)) {
      try {
        await userService.delete(id);

        toast.success(
          isLocked
            ? "Đã mở khóa tài khoản thành công!"
            : "Đã khóa tài khoản thành công!",
        );

        fetchUsers(currentPage);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Có lỗi xảy ra!");
      }
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];

    let result = [...users];

    if (filterStatus === "active") {
      result = result.filter((user) => !user?.isLocked);
    }

    if (filterStatus === "locked") {
      result = result.filter((user) => user?.isLocked);
    }

    return result.sort((a, b) => {
      const aLocked = a?.isLocked ? 1 : 0;
      const bLocked = b?.isLocked ? 1 : 0;

      if (aLocked !== bLocked) return aLocked - bLocked;

      const aName = a?.fullName || a?.username || "";
      const bName = b?.fullName || b?.username || "";
      return aName.localeCompare(bName, "vi", { sensitivity: "base" });
    });
  }, [users, filterStatus]);

  const getRoleBadgeClass = (role) => {
    const normalized = normalizeRoleValue(role);

    if (normalized === "admin") return "us-roleBadge us-roleAdmin";
    if (normalized === "manager") return "us-roleBadge us-roleManager";
    if (normalized === "staff") return "us-roleBadge us-roleStaff";
    return "us-roleBadge us-roleCustomer";
  };

  const getStatusBadgeClass = (isLocked) => {
    return isLocked
      ? "us-statusBadge us-statusLocked"
      : "us-statusBadge us-statusActive";
  };

  const getAvatar = (user) => {
    return user?.avatarUrl || "/dist/img/user2-160x160.jpg";
  };

  return (
    <div className="us-page">
      <section className="content-header us-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-12">
              <div className="us-head">
                <div>
                  <h1 className="us-title">Quản lý Người dùng</h1>
                  <p className="us-subtitle">
                    Quản lý tài khoản, vai trò và trạng thái hoạt động của người
                    dùng
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content us-content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <div className="us-card">
                <div className="us-cardHeader">
                  <div className="us-cardTitleWrap">
                    <h3 className="us-cardTitle">Danh sách tài khoản</h3>
                    <span className="us-cardMeta">
                      Tổng hiển thị: {filteredAndSortedUsers.length} người dùng
                    </span>
                  </div>

                  <div className="us-toolbar">
                    <select
                      className="us-select"
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                    >
                      <option value="">Tất cả vai trò</option>
                      <option value="admin">Quản trị viên</option>
                      <option value="manager">Quản lý</option>
                      <option value="staff">Nhân viên</option>
                      <option value="customer">Khách hàng</option>
                    </select>

                    <select
                      className="us-select"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="active">Hoạt động</option>
                      <option value="locked">Đang khóa</option>
                    </select>

                    <div className="us-searchWrap">
                      <input
                        type="text"
                        className="us-searchInput"
                        placeholder="Tìm tên, username, email..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <button
                        type="button"
                        className="us-btn us-btnSearch"
                        onClick={handleFilter}
                        title="Tìm kiếm"
                      >
                        <i className="fas fa-search"></i>
                      </button>
                    </div>

                    <button
                      type="button"
                      className="us-btn us-btnGhost"
                      onClick={() => fetchUsers(currentPage)}
                      title="Làm mới"
                    >
                      <i className="fas fa-sync-alt"></i>
                    </button>

                    <button
                      type="button"
                      className="us-btn us-btnPrimary"
                      onClick={handleCreateClick}
                    >
                      <i className="fas fa-plus"></i>
                      <span>Thêm user</span>
                    </button>
                  </div>
                </div>

                <div className="us-tableWrap">
                  <table className="us-table">
                    <thead>
                      <tr>
                        <th style={{ width: "6%" }}>STT</th>
                        <th style={{ width: "10%" }} className="us-center">
                          Ảnh
                        </th>
                        <th style={{ width: "22%" }}>Tên / Tài khoản</th>
                        <th style={{ width: "24%" }}>Liên hệ</th>
                        <th style={{ width: "12%" }} className="us-center">
                          Vai trò
                        </th>
                        <th style={{ width: "12%" }} className="us-center">
                          Trạng thái
                        </th>
                        <th style={{ width: "7%" }} className="us-center">
                          Sửa
                        </th>
                        <th style={{ width: "7%" }} className="us-center">
                          Khóa
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="8" className="us-emptyCell">
                            <div
                              className="spinner-border text-primary"
                              role="status"
                            >
                              <span className="sr-only">Loading...</span>
                            </div>
                            <p className="us-loadingText">
                              Đang tải dữ liệu...
                            </p>
                          </td>
                        </tr>
                      ) : filteredAndSortedUsers.length > 0 ? (
                        filteredAndSortedUsers.map((user, index) => (
                          <tr
                            key={user._id}
                            className={user?.isLocked ? "us-rowLocked" : ""}
                          >
                            <td className="us-stt">
                              {(currentPage - 1) * LIMIT + index + 1}
                            </td>

                            <td className="us-center">
                              <div className="us-avatarBox">
                                <img
                                  alt="Avatar"
                                  className="us-avatar"
                                  src={getAvatar(user)}
                                />
                              </div>
                            </td>

                            <td>
                              <div className="us-mainText">
                                {user.fullName || "Chưa cập nhật tên"}
                              </div>
                              <div className="us-subText">@{user.username}</div>
                            </td>

                            <td>
                              <div className="us-contactLine">
                                <i className="fas fa-envelope fa-fw"></i>
                                <span>{user.email}</span>
                              </div>
                              <div className="us-contactLine">
                                <i className="fas fa-phone fa-fw"></i>
                                <span>{user.phoneNumber || "N/A"}</span>
                              </div>
                            </td>

                            <td className="us-center">
                              <span className={getRoleBadgeClass(user.role)}>
                                {getRoleLabel(user.role)}
                              </span>
                            </td>

                            <td className="us-center">
                              <span
                                className={getStatusBadgeClass(user.isLocked)}
                              >
                                {user.isLocked ? "Đang khóa" : "Hoạt động"}
                              </span>
                            </td>

                            <td className="us-center">
                              <button
                                className="us-btnAction us-btnEdit"
                                onClick={() => handleEditClick(user)}
                                title="Chỉnh sửa"
                              >
                                <span>Sửa</span>
                              </button>
                            </td>

                            <td className="us-center">
                              <button
                                className={`us-btnAction ${
                                  user.isLocked ? "us-btnUnlock" : "us-btnLock"
                                }`}
                                onClick={() =>
                                  handleToggleLockClick(user._id, user.isLocked)
                                }
                                title={
                                  user.isLocked
                                    ? "Mở khóa tài khoản"
                                    : "Khóa tài khoản"
                                }
                              >
                                <i
                                  className={`fas ${
                                    user.isLocked ? "fa-unlock" : "fa-lock"
                                  }`}
                                ></i>
                                <span>{user.isLocked ? "Mở" : "Khóa"}</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="us-emptyCell">
                            Không có dữ liệu người dùng.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!loading && (
                  <div className="us-paginationWrap">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <UserAddOrEditModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        refreshData={fetchUsers}
        initialData={selectedUser}
      />

      <style jsx>{`
        .us-page {
          font-family: "Roboto", sans-serif;
        }

        .us-header {
          margin-bottom: 6px;
        }

        .us-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .us-title {
          margin: 0;
          font-size: 2.1rem;
          font-weight: 800;
          color: #244656;
        }

        .us-subtitle {
          margin: 6px 0 0;
          font-size: 0.95rem;
          color: #6d8796;
        }

        .us-content {
          padding-bottom: 20px;
        }

        .us-card {
          background: #fff;
          border: 1px solid #bdd4e0;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(79, 151, 187, 0.08);
        }

        .us-cardHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          padding: 18px 20px;
          border-bottom: 1px solid #e2edf4;
          background: #fff;
        }

        .us-cardTitleWrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .us-cardTitle {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 800;
          color: #244656;
        }

        .us-cardMeta {
          font-size: 0.88rem;
          color: #6d8796;
        }

        .us-toolbar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .us-select,
        .us-searchInput {
          height: 38px;
          border-radius: 10px;
          border: 1px solid #bdd4e0;
          background: #fff;
          color: #244656;
          font-family: "Roboto", sans-serif;
          padding: 0 12px;
          outline: none;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }

        .us-select {
          min-width: 165px;
        }

        .us-searchInput {
          width: 220px;
          padding-right: 42px;
        }

        .us-select:focus,
        .us-searchInput:focus {
          border-color: #4f97bb;
          box-shadow: 0 0 0 0.2rem rgba(79, 151, 187, 0.14);
        }

        .us-searchWrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .us-btn {
          height: 38px;
          border-radius: 10px;
          border: 1px solid transparent;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: "Roboto", sans-serif;
          font-weight: 700;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
        }

        .us-btnSearch {
          position: absolute;
          right: 4px;
          height: 28px;
          width: 28px;
          border-radius: 7px;
          background: #f3f7fa;
          border: 1px solid #d6e5ee;
          color: #6f8a99;
          padding: 0;
          box-shadow: none;
        }

        .us-btnSearch:hover {
          background: #eaf2f7;
          border-color: #c7dce8;
          color: #4f7082;
        }

        .us-btnGhost {
          background: #fff;
          border-color: #bdd4e0;
          color: #35799d;
        }

        .us-btnGhost:hover {
          background: #e2eef5;
          border-color: #4f97bb;
        }

        .us-btnPrimary {
          background: #4f97bb;
          border-color: #4f97bb;
          color: #fff;
          box-shadow: 0 8px 18px rgba(79, 151, 187, 0.16);
        }

        .us-btnPrimary:hover {
          background: #35799d;
          border-color: #35799d;
          transform: translateY(-1px);
        }

        .us-tableWrap {
          width: 100%;
          overflow-x: auto;
        }

        .us-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1140px;
        }

        .us-table thead th {
          background: #e2edf4;
          color: #5f7d8d;
          font-size: 0.84rem;
          font-weight: 800;
          border-bottom: 1px solid #d7e5ec;
          padding: 13px 10px;
          vertical-align: middle;
        }

        .us-table td {
          padding: 13px 10px;
          border-bottom: 1px solid #edf3f6;
          font-size: 0.92rem;
          color: #244656;
          vertical-align: middle;
          word-break: break-word;
          background: #fff;
        }

        .us-table tbody tr:hover td {
          background: rgba(79, 151, 187, 0.05);
        }

        .us-rowLocked td {
          background: #fafcfd;
          opacity: 0.9;
        }

        .us-center {
          text-align: center !important;
        }

        .us-stt {
          font-weight: 800;
          color: #35799d;
        }

        .us-avatarBox {
          width: 48px;
          height: 48px;
          margin: 0 auto;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #d7e5ec;
          background: #f7fafc;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .us-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .us-mainText {
          font-weight: 800;
          color: #244656;
          margin-bottom: 4px;
          line-height: 1.35;
        }

        .us-subText {
          color: #6d8796;
          font-size: 0.88rem;
        }

        .us-contactLine {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 5px;
          color: #244656;
          line-height: 1.45;
        }

        .us-contactLine:last-child {
          margin-bottom: 0;
        }

        .us-roleBadge,
        .us-statusBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 94px;
          height: 30px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 800;
          border: 1px solid transparent;
        }

        .us-roleAdmin {
          background: rgba(224, 72, 72, 0.12);
          color: #c0392b;
          border-color: rgba(224, 72, 72, 0.2);
        }

        .us-roleManager {
          background: rgba(155, 89, 182, 0.12);
          color: #8e44ad;
          border-color: rgba(155, 89, 182, 0.2);
        }

        .us-roleStaff {
          background: rgba(79, 151, 187, 0.12);
          color: #35799d;
          border-color: rgba(79, 151, 187, 0.24);
        }

        .us-roleCustomer {
          background: rgba(255, 193, 7, 0.14);
          color: #b7791f;
          border-color: rgba(255, 193, 7, 0.28);
        }

        .us-statusActive {
          background: rgba(76, 175, 80, 0.12);
          color: #2e7d32;
          border-color: rgba(76, 175, 80, 0.2);
        }

        .us-statusLocked {
          background: rgba(239, 83, 80, 0.12);
          color: #c62828;
          border-color: rgba(239, 83, 80, 0.2);
        }

        .us-btnAction {
          min-width: 64px;
          height: 30px;
          padding: 0 8px;
          border-radius: 8px;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-weight: 700;
          font-size: 0.76rem;
          font-family: "Roboto", sans-serif;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .us-btnAction i {
          font-size: 0.72rem;
        }

        .us-btnEdit {
          background: #1e459f;
          border-color: #1e459f;
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(30, 69, 159, 0.14);
        }

        .us-btnEdit:hover {
          background: #183b87;
          border-color: #183b87;
          transform: translateY(-1px);
        }

        .us-btnLock {
          background: #cf2a2a;
          border-color: #cf2a2a;
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(207, 42, 42, 0.14);
        }

        .us-btnLock:hover {
          background: #b82424;
          border-color: #b82424;
          transform: translateY(-1px);
        }

        .us-btnUnlock {
          background: #ffffff;
          border-color: #cddceb;
          color: #1e459f;
          box-shadow: 0 4px 10px rgba(30, 69, 159, 0.08);
        }

        .us-btnUnlock:hover {
          background: #eef4fb;
          border-color: #1e459f;
          color: #16377f;
          transform: translateY(-1px);
        }

        .us-emptyCell {
          text-align: center;
          padding: 28px 16px !important;
          color: #6d8796;
        }

        .us-loadingText {
          margin: 10px 0 0;
          color: #6d8796;
        }

        .us-paginationWrap {
          padding: 14px 16px;
          border-top: 1px solid #edf3f6;
          background: #fff;
        }

        @media (max-width: 991px) {
          .us-cardHeader {
            flex-direction: column;
            align-items: stretch;
          }

          .us-toolbar {
            justify-content: flex-start;
          }
        }

        @media (max-width: 768px) {
          .us-title {
            font-size: 1.7rem;
          }

          .us-subtitle {
            font-size: 0.9rem;
          }

          .us-toolbar {
            width: 100%;
          }

          .us-select,
          .us-searchWrap,
          .us-searchInput,
          .us-btnGhost,
          .us-btnPrimary {
            width: 100%;
          }

          .us-searchWrap {
            display: flex;
          }

          .us-searchInput {
            width: 100%;
          }

          .us-table {
            min-width: 1140px;
          }
        }
      `}</style>
    </div>
  );
};

export default Users;
