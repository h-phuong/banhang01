import axiosClient from "./axiosClient";

const userService = {
  // Lấy tất cả user
  getAll: (page, limit, search = "", role = "", status = "") => {
    return axiosClient.get("/users", {
      params: {
        page,
        limit,
        search,
        role,
        status,
      },
    });
  },

  // Lấy chi tiết 1 user
  getById: (id) => {
    return axiosClient.get(`/users/${id}`);
  },

  // Tạo mới
  create: (data) => {
    return axiosClient.post("/users", data);
  },

  // Cập nhật
  update: (id, data) => {
    return axiosClient.put(`/users/${id}`, data);
  },

  // Khóa / mở khóa tùy backend xử lý
  delete: (id) => {
    return axiosClient.delete(`/users/${id}`);
  },
};

export default userService;
