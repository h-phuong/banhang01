import axiosClient from "./axiosClient";

const API_URL = "/products";

// Lấy tất cả
const getAll = (params = {}) => {
  return axiosClient.get(API_URL, { params });
};

// Lấy theo ID
const getById = (id) => {
  return axiosClient.get(`${API_URL}/${id}`);
};

// Lấy theo category slug
const getByCategorySlug = (slug, params = {}) => {
  return axiosClient.get(API_URL, {
    params: {
      categorySlug: slug,
      ...params,
    },
  });
};

const create = (payload) => axiosClient.post(API_URL, payload);

const update = (id, payload) => axiosClient.put(`${API_URL}/${id}`, payload);

const remove = (id) => axiosClient.delete(`${API_URL}/${id}`);

export default {
  getAll,
  getById,
  getByCategorySlug,
  create,
  update,
  remove,
};
