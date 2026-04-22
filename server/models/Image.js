const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    imagePath: { type: String, required: true }, // Đường dẫn tương đối: /uploads/image-xxx.jpg
    originalName: { type: String },
    fileSize: { type: Number }, // Kích thước file (bytes)
    mimeType: { type: String }, // image/jpeg, etc
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null }, // Liên kết với sản phẩm nếu có
    uploadedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Image', imageSchema);
