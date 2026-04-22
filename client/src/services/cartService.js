import axios from "axios";

const API_BASE = "http://localhost:5000/api/cart";

export const getCartApi = async (userId) => {
  const res = await axios.get(`${API_BASE}/${userId}`);
  return res.data;
};

export const addToCartApi = async (payload) => {
  const res = await axios.post(`${API_BASE}/add`, payload);
  return res.data;
};

export const updateCartQuantityApi = async (payload) => {
  const res = await axios.patch(`${API_BASE}/update-quantity`, payload);
  return res.data;
};

export const updateCartVariantApi = async (payload) => {
  const res = await axios.patch(`${API_BASE}/update-variant`, payload);
  return res.data;
};

export const removeCartItemApi = async (payload) => {
  const res = await axios.delete(`${API_BASE}/remove`, {
    data: payload,
  });
  return res.data;
};

export const clearCartApi = async (userId) => {
  const res = await axios.delete(`${API_BASE}/clear/${userId}`);
  return res.data;
};
