import axios from "axios";

const API = "http://localhost:5000/api/contacts";

// CLIENT gửi liên hệ
export const sendContact = async (data) => {
    const res = await axios.post(API, data);
    return res.data;
};

// ADMIN lấy danh sách liên hệ
export const getContacts = async () => {
    const res = await axios.get(API);
    return res.data;
};

// ADMIN trả lời
export const replyContact = async (id, reply) => {
    const res = await axios.put(`${API}/${id}/reply`, { reply });
    return res.data;
};