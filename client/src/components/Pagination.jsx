import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  // Nếu chỉ có 1 trang hoặc không có dữ liệu thì ẩn phân trang
  if (totalPages <= 1) return null;

  // Tạo mảng số trang (Ví dụ: [1, 2, 3, 4, 5])
  const pages = [...Array(totalPages).keys()].map(num => num + 1);

  return (
    <div className="card-footer clearfix">
      <ul className="pagination pagination-sm m-0 float-right">
        {/* Nút Previous */}
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button 
            className="page-link" 
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &laquo;
          </button>
        </li>

        {/* Danh sách số trang */}
        {pages.map(page => (
          <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          </li>
        ))}

        {/* Nút Next */}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button 
            className="page-link" 
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            &raquo;
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Pagination;