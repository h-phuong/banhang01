const mongoose = require('mongoose');

// 1. Schema Màu sắc
const colorSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true }, // VD: Đỏ, Xanh Dương
    hexCode: { type: String, required: true, trim: true } // VD: #FF0000
}, { timestamps: false });

// 2. Schema Kích thước
const sizeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true } // VD: S, M, L, XL, 39, 40
}, { timestamps: false });

const Color = mongoose.model('Color', colorSchema);
const Size = mongoose.model('Size', sizeSchema);

module.exports = { Color, Size };