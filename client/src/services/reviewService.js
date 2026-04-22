import axiosClient from "./axiosClient";

const reviewService = {

    // lấy review theo sản phẩm
    getByProduct: (productId) => {
        return axiosClient.get(`/reviews/product/${productId}`);
    },

    // tạo review
    create: (data) => {
        return axiosClient.post("/reviews", data);
    },

    // lấy tất cả review (cho admin)
    getAll: () => {
        return axiosClient.get("/reviews");
    },

    // admin trả lời review
    reply: (id, data) => {
        return axiosClient.put(`/reviews/${id}/reply`, data);
    },

    // xóa review
    remove: (id) => {
        return axiosClient.delete(`/reviews/${id}`);
    }

};

export default reviewService;