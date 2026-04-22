import React, { useEffect, useMemo, useState } from "react";
import categoryService from "../../../services/categoryService";
import {
  createCategoryList,
  flattenCategoriesForTable,
} from "../../../Utils/dataUtils";
import { toast } from "react-toastify";

const AdminCategory = () => {
  const [categories, setCategories] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState({ name: "", parentId: "" });
  const [editId, setEditId] = useState(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await categoryService.getAll();
      const rawData = Array.isArray(response)
        ? response
        : response.categories || [];

      setCategories(rawData);

      const categoryTree = createCategoryList(rawData);
      const flatTable = flattenCategoriesForTable(categoryTree);
      setTableData(flatTable);
    } catch (error) {
      toast.error("Lỗi: Không thể tải danh sách danh mục");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      parentId: formData.parentId === "" ? null : formData.parentId,
    };

    try {
      if (isEdit) {
        await categoryService.update(editId, payload);
        toast.success("Cập nhật danh mục thành công!");
      } else {
        await categoryService.create(payload);
        toast.success("Thêm mới danh mục thành công!");
      }

      setShowModal(false);
      setFormData({ name: "", parentId: "" });
      setEditId(null);
      fetchCategories();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!";
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa danh mục này?")) {
      try {
        await categoryService.delete(id);
        toast.success("Đã xóa danh mục thành công!");
        fetchCategories();
      } catch (error) {
        toast.error(
          "Không thể xóa. Có thể danh mục này đang chứa sản phẩm hoặc danh mục con.",
        );
      }
    }
  };

  const handleOpenModal = () => {
    setIsEdit(false);
    setEditId(null);
    setFormData({ name: "", parentId: "" });
    setShowModal(true);
  };

  const handleEditClick = (cat) => {
    setIsEdit(true);
    setEditId(cat._id);
    setFormData({
      name: cat.name,
      parentId: cat.parentId || "",
    });
    setShowModal(true);
  };

  const renderOptions = (treeNodes, level = 0) => {
    let options = [];

    for (let node of treeNodes) {
      if (isEdit && node._id === editId) continue;

      const prefix = level === 0 ? "" : "--".repeat(level) + " ";

      options.push(
        <option key={node._id} value={node._id}>
          {prefix + node.name}
        </option>,
      );

      if (node.children && node.children.length > 0) {
        options.push(...renderOptions(node.children, level + 1));
      }
    }
    return options;
  };

  const categoryTreeForDropdown = createCategoryList(categories);

  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach((item) => {
      map.set(String(item._id), item);
    });
    return map;
  }, [categories]);

  const stats = useMemo(() => {
    const total = tableData.length;
    const rootCount = tableData.filter((item) => item.level === 0).length;
    const childCount = tableData.filter((item) => item.level > 0).length;

    return { total, rootCount, childCount };
  }, [tableData]);

  const filteredTableData = useMemo(() => {
    let result = [...tableData];

    const keyword = searchText.trim().toLowerCase();
    if (keyword) {
      result = result.filter((cat) => {
        const parentName =
          cat.parentId && categoryMap.get(String(cat.parentId))
            ? categoryMap.get(String(cat.parentId)).name || ""
            : "";

        return (
          String(cat.name || "")
            .toLowerCase()
            .includes(keyword) ||
          String(cat.slug || "")
            .toLowerCase()
            .includes(keyword) ||
          String(parentName).toLowerCase().includes(keyword)
        );
      });
    }

    if (filterType === "root") {
      result = result.filter((cat) => cat.level === 0);
    }

    if (filterType === "child") {
      result = result.filter((cat) => cat.level > 0);
    }

    return result;
  }, [tableData, searchText, filterType, categoryMap]);

  const getParentName = (cat) => {
    if (!cat.parentId) return "—";
    const parent = categoryMap.get(String(cat.parentId));
    return parent?.name || "—";
  };

  const getLevelLabel = (level) => {
    if (level === 0) return "Gốc";
    return `Cấp ${level + 1}`;
  };

  return (
    <div className="ac-page">
      <div className="ac-head">
        <div>
          <h2 className="ac-title">Danh mục</h2>
          <p className="ac-subtitle">
            Quản lý danh mục gốc, danh mục con và cấu trúc hiển thị sản phẩm.
          </p>
        </div>

        <div className="ac-actions">
          <button className="ac-btn ac-btnPrimary" onClick={handleOpenModal}>
            + Thêm danh mục
          </button>
        </div>
      </div>

      <div className="ac-stats">
        <div className="ac-statCard">
          <div className="ac-statLabel">Tổng danh mục</div>
          <div className="ac-statValue">{stats.total}</div>
        </div>

        <div className="ac-statCard">
          <div className="ac-statLabel">Danh mục gốc</div>
          <div className="ac-statValue">{stats.rootCount}</div>
        </div>

        <div className="ac-statCard">
          <div className="ac-statLabel">Danh mục con</div>
          <div className="ac-statValue">{stats.childCount}</div>
        </div>
      </div>

      <div className="ac-toolbar">
        <div className="ac-field">
          <span className="ac-label">Tìm kiếm</span>
          <input
            className="ac-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Nhập tên danh mục, slug, danh mục cha..."
          />
        </div>

        <div className="ac-field">
          <span className="ac-label">Loại danh mục</span>
          <select
            className="ac-input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">-- Tất cả --</option>
            <option value="root">Danh mục gốc</option>
            <option value="child">Danh mục con</option>
          </select>
        </div>

        <div className="ac-field ac-fieldRight">
          <span className="ac-label">Hiển thị</span>
          <div className="ac-statBox">
            <span className="ac-badge ac-badgeInfo">
              {filteredTableData.length} mục
            </span>
          </div>
        </div>
      </div>

      <div className="ac-card">
        <div className="ac-tableWrap">
          <table className="ac-table">
            <thead>
              <tr>
                <th className="ac-center" style={{ width: "7%" }}>
                  #
                </th>
                <th style={{ width: "30%" }}>Tên danh mục</th>
                <th style={{ width: "21%" }}>Danh mục cha</th>
                <th className="ac-center" style={{ width: "12%" }}>
                  Cấp độ
                </th>
                <th style={{ width: "15%" }}>Slug</th>
                <th className="ac-center" style={{ width: "15%" }}>
                  Hành động
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="ac-muted ac-center">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredTableData.length > 0 ? (
                filteredTableData.map((cat, index) => (
                  <tr key={cat._id}>
                    <td className="ac-center">{index + 1}</td>

                    <td>
                      <div
                        className="ac-nameCell"
                        style={{ paddingLeft: `${cat.level * 24}px` }}
                      >
                        {cat.level > 0 && (
                          <i className="fas fa-level-up-alt fa-rotate-90 ac-levelIcon"></i>
                        )}

                        <span
                          className={
                            cat.level === 0 ? "ac-rootName" : "ac-childName"
                          }
                        >
                          {cat.name}
                        </span>

                        {cat.level === 0 && (
                          <span className="ac-badge ac-badgeSuccess">Gốc</span>
                        )}
                      </div>
                    </td>

                    <td>{getParentName(cat)}</td>

                    <td className="ac-center">
                      <span className="ac-badge ac-badgeSoft">
                        {getLevelLabel(cat.level)}
                      </span>
                    </td>

                    <td className="ac-mono">{cat.slug}</td>

                    <td className="ac-center">
                      <div className="ac-actionGroup ac-actionGroupCenter">
                        <button
                          className="ac-btn ac-btnEdit"
                          onClick={() => handleEditClick(cat)}
                        >
                          Sửa
                        </button>

                        <button
                          className="ac-btn ac-btnDanger"
                          onClick={() => handleDelete(cat._id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="ac-muted ac-center">
                    Không có dữ liệu phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div
          className="ac-modalBackdrop"
          onMouseDown={() => setShowModal(false)}
        >
          <div className="ac-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ac-modalHead">
              <h3 className="ac-modalTitle">
                {isEdit ? "Cập nhật danh mục" : "Thêm danh mục"}
              </h3>

              <button
                type="button"
                className="ac-btn ac-btnGhost"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form className="ac-form" onSubmit={handleSubmit}>
              <div className="ac-grid">
                <div className="ac-field ac-fieldFull">
                  <span className="ac-label">
                    Tên danh mục <span className="ac-required">*</span>
                  </span>
                  <input
                    type="text"
                    className="ac-input"
                    placeholder="Ví dụ: Thời trang nam"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="ac-field ac-fieldFull">
                  <span className="ac-label">Danh mục cha</span>
                  <select
                    className="ac-input"
                    value={formData.parentId}
                    onChange={(e) =>
                      setFormData({ ...formData, parentId: e.target.value })
                    }
                  >
                    <option value="">
                      -- Là danh mục gốc (Không có cha) --
                    </option>
                    {renderOptions(categoryTreeForDropdown)}
                  </select>

                  <small className="ac-helpText">
                    Chọn danh mục cấp trên nếu đây là danh mục con.
                  </small>
                </div>
              </div>

              <div className="ac-formActions">
                <button
                  type="button"
                  className="ac-btn ac-btnGhost"
                  onClick={() => setShowModal(false)}
                >
                  Huỷ
                </button>

                <button type="submit" className="ac-btn ac-btnPrimary">
                  {isEdit ? "Lưu cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .ac-page {
          font-family: "Roboto", sans-serif;
          animation: acFadeIn 0.25s ease-in-out;
        }

        @keyframes acFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ac-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-top: 18px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .ac-title {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: #35799d;
        }

        .ac-subtitle {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.5;
          color: #6d8796;
        }

        .ac-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ac-btn {
          font-family: "Roboto", sans-serif;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid transparent;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          transition: all 0.18s ease;
          user-select: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .ac-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ac-btnPrimary {
          background: #4f97bb;
          border-color: #4f97bb;
          color: #fff;
          box-shadow: 0 10px 24px rgba(79, 151, 187, 0.18);
        }

        .ac-btnPrimary:hover {
          background: #35799d;
          border-color: #35799d;
          transform: translateY(-1px);
        }

        .ac-btnGhost {
          background: #fff;
          border-color: #bdd4e0;
          color: #35799d;
        }

        .ac-btnGhost:hover {
          background: #e2eef5;
          border-color: #4f97bb;
          color: #244656;
        }

        .ac-btnEdit {
          min-width: 64px;
          background: #1e459f;
          border-color: #1e459f;
          color: #fff;
          box-shadow: 0 8px 18px rgba(30, 69, 159, 0.14);
        }

        .ac-btnEdit:hover {
          background: #183b87;
          border-color: #183b87;
          transform: translateY(-1px);
        }

        .ac-btnDanger {
          min-width: 64px;
          background: #cf2a2a;
          border-color: #cf2a2a;
          color: #fff;
          box-shadow: 0 8px 18px rgba(207, 42, 42, 0.14);
        }

        .ac-btnDanger:hover {
          background: #b82424;
          border-color: #b82424;
          transform: translateY(-1px);
        }

        .ac-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin: 20px 0 14px;
        }

        .ac-statCard {
          background: #fff;
          border: 1px solid #bdd4e0;
          border-radius: 16px;
          padding: 16px 18px;
          box-shadow: 0 6px 18px rgba(79, 151, 187, 0.08);
        }

        .ac-statLabel {
          font-size: 12px;
          font-weight: 700;
          color: #6d8796;
          margin-bottom: 8px;
        }

        .ac-statValue {
          font-size: 28px;
          font-weight: 800;
          color: #244656;
          line-height: 1;
        }

        .ac-toolbar {
          display: grid;
          grid-template-columns: 1.3fr 1fr auto;
          gap: 14px;
          align-items: end;
          background: #fff;
          border: 1px solid #bdd4e0;
          border-radius: 16px;
          padding: 16px;
          margin: 0 0 24px;
          box-shadow: 0 6px 18px rgba(79, 151, 187, 0.08);
        }

        .ac-statBox {
          min-height: 42px;
          display: flex;
          align-items: center;
        }

        .ac-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 18px 16px;
          align-items: start;
        }

        .ac-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .ac-fieldFull {
          grid-column: 1 / -1;
        }

        .ac-fieldRight {
          margin-left: auto;
          min-width: auto;
          align-items: flex-end;
        }

        .ac-label {
          font-size: 14px;
          font-weight: 700;
          color: #244656;
          line-height: 1.4;
        }

        .ac-required {
          color: #cf2a2a;
        }

        .ac-input {
          font-family: "Roboto", sans-serif;
          height: 42px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid #bdd4e0;
          outline: none;
          background: #fff;
          color: #244656;
          font-size: 13px;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .ac-input:focus {
          border-color: #4f97bb;
          box-shadow: 0 0 0 0.2rem rgba(79, 151, 187, 0.14);
        }

        .ac-input::placeholder {
          color: #90a5b1;
        }

        .ac-helpText {
          margin-top: -2px;
          font-size: 12px;
          color: #7a95a4;
        }

        .ac-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #bdd4e0;
          overflow: hidden;
          box-shadow: 0 6px 18px rgba(79, 151, 187, 0.08);
        }

        .ac-tableWrap {
          width: 100%;
          overflow: auto;
        }

        .ac-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 920px;
        }

        .ac-table thead th {
          background: #e2edf4;
          color: #5f7d8d;
          font-size: 12px;
          font-weight: 800;
          border-bottom: 1px solid #d7e5ec;
          padding: 13px 12px;
          white-space: nowrap;
        }

        .ac-table td {
          padding: 12px;
          border-bottom: 1px solid #edf3f6;
          font-size: 13px;
          color: #244656;
          vertical-align: middle;
          word-break: break-word;
        }

        .ac-table tbody tr:hover td {
          background: rgba(79, 151, 187, 0.05);
        }

        .ac-right {
          text-align: right !important;
        }

        .ac-center {
          text-align: center !important;
        }

        .ac-muted {
          color: #7a95a4 !important;
        }

        .ac-mono {
          font-family: "Roboto", sans-serif;
          font-size: 12px;
          letter-spacing: 0.3px;
        }

        .ac-nameCell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ac-levelIcon {
          color: #9db2bf;
          font-size: 12px;
          flex-shrink: 0;
        }

        .ac-rootName {
          font-weight: 800;
          color: #35799d;
        }

        .ac-childName {
          font-weight: 600;
          color: #244656;
        }

        .ac-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 26px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          border: 1px solid transparent;
          font-family: "Roboto", sans-serif;
          line-height: 1;
        }

        .ac-badgeSuccess {
          background: rgba(12, 107, 55, 0.1);
          color: #0c6b37;
          border-color: rgba(12, 107, 55, 0.22);
        }

        .ac-badgeInfo {
          background: rgba(30, 69, 159, 0.1);
          color: #1e459f;
          border-color: rgba(30, 69, 159, 0.22);
        }

        .ac-badgeSoft {
          background: rgba(79, 151, 187, 0.1);
          color: #35799d;
          border: 1px solid rgba(79, 151, 187, 0.22);
          border-radius: 8px;
          min-height: 28px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 800;
        }

        .ac-actionGroup {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ac-actionGroupCenter {
          justify-content: center;
        }

        .ac-modalBackdrop {
          position: fixed;
          inset: 0;
          background: rgba(36, 70, 86, 0.32);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .ac-modal {
          width: 560px;
          max-width: 94%;
          max-height: 90vh;
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 20px 48px rgba(53, 121, 157, 0.18);
          display: flex;
          flex-direction: column;
          border: 1px solid #bdd4e0;
        }

        .ac-modalHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px;
          border-bottom: 1px solid #e6eef3;
          flex-shrink: 0;
          background: #f7fafc;
        }

        .ac-modalTitle {
          margin: 0;
          font-size: 17px;
          font-weight: 900;
          color: #35799d;
          font-family: "Roboto", sans-serif;
        }

        .ac-form {
          padding: 16px;
          overflow-y: auto;
          flex: 1 1 auto;
          min-height: 0;
          font-family: "Roboto", sans-serif;
        }

        .ac-form::-webkit-scrollbar {
          width: 8px;
        }

        .ac-form::-webkit-scrollbar-thumb {
          background: rgba(79, 151, 187, 0.28);
          border-radius: 999px;
        }

        .ac-formActions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 16px 16px;
          border-top: 1px solid #e6eef3;
          background: #fff;
          position: sticky;
          bottom: 0;
          z-index: 2;
        }

        @media (max-width: 900px) {
          .ac-stats {
            grid-template-columns: 1fr;
          }

          .ac-toolbar {
            grid-template-columns: 1fr;
          }

          .ac-fieldRight {
            margin-left: 0;
            align-items: flex-start;
          }
        }

        @media (max-width: 820px) {
          .ac-table {
            min-width: 780px;
          }

          .ac-modal {
            width: 100%;
            max-width: 100%;
            max-height: 94vh;
            border-radius: 14px;
          }

          .ac-formActions {
            flex-wrap: wrap;
          }

          .ac-formActions .ac-btn {
            width: 100%;
          }
        }

        @media (max-width: 576px) {
          .ac-page {
            font-size: 14px;
          }

          .ac-title {
            font-size: 20px;
          }

          .ac-subtitle {
            font-size: 12px;
          }

          .ac-toolbar,
          .ac-form,
          .ac-modalHead,
          .ac-formActions {
            padding-left: 12px;
            padding-right: 12px;
          }

          .ac-toolbar {
            padding-top: 14px;
            padding-bottom: 14px;
            gap: 12px;
          }

          .ac-btn {
            min-height: 40px;
            padding: 0 12px;
            font-size: 12px;
          }

          .ac-input {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminCategory;
