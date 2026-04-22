// src/services/categoryService.js
import axiosClient from './axiosClient';

const categoryService = {
    // 1. Lấy danh sách (GET /categories)
    getAll: () => {
        // axiosClient đã có baseURL, nên chỉ cần gõ phần đuôi
        return axiosClient.get('/categories'); 
    },

    // 2. Thêm mới (POST /categories)
    create: (data) => {
        return axiosClient.post('/categories', data);
    },

    // 3. Cập nhật (PUT /categories/:id)
    update: (id, data) => {
        return axiosClient.put(`/categories/${id}`, data);
    },

    // 4. Xóa (DELETE /categories/:id)
    delete: (id) => {
        return axiosClient.delete(`/categories/${id}`);
    }
};

export default categoryService;