const mongoose = require('mongoose');

// 1. Schema Thông báo (Notification)
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    type: { type: String, enum: ['OrderUpdate', 'Promotion', 'System'] },
    relatedId: { type: mongoose.Schema.Types.ObjectId }, // Link tới Đơn hàng hoặc Bài viết
}, { timestamps: true });

// Tạo Index để query thông báo của user nhanh hơn
notificationSchema.index({ userId: 1, createdAt: -1 });


// 2. Schema Đánh giá (Review)
const reviewSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, // Chỉ cho phép đánh giá khi đã mua
    
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true },
}, { timestamps: true });

// Ràng buộc: Mỗi User chỉ được đánh giá 1 lần cho 1 Đơn hàng cụ thể (Chống Spam)
reviewSchema.index({ orderId: 1, userId: 1, productId: 1 }, { unique: true });

// --- STATIC METHOD: TÍNH TOÁN RATING ---
// Hàm này sẽ chạy Aggregation để tính trung bình cộng
reviewSchema.statics.calcAverageRating = async function(productId) {
    const stats = await this.aggregate([
        { $match: { productId: productId } },
        {
            $group: {
                _id: '$productId',
                nRating: { $sum: 1 }, // Đếm tổng số đánh giá
                avgRating: { $avg: '$rating' } // Tính trung bình sao
            }
        }
    ]);

    // Cập nhật kết quả vào bảng Product
    try {
        await mongoose.model('Product').findByIdAndUpdate(productId, {
            averageRating: stats.length > 0 ? stats[0].avgRating : 0,
            numOfReviews: stats.length > 0 ? stats[0].nRating : 0
        });
    } catch (error) {
        console.error("Lỗi cập nhật rating sản phẩm:", error);
    }
};

// --- MIDDLEWARE ---
// 1. Sau khi LƯU review mới -> Tính lại sao
reviewSchema.post('save', function() {
    this.constructor.calcAverageRating(this.productId);
});

// 2. Sau khi XÓA hoặc SỬA review -> Tính lại sao
// Lưu ý: Trong controller phải dùng hàm `findOneAndDelete` hoặc `findOneAndUpdate`
reviewSchema.post(/^findOneAnd/, async function(doc) {
    if (doc) {
        await doc.constructor.calcAverageRating(doc.productId);
    }
});

const Notification = mongoose.model('Notification', notificationSchema);
const ProductReview = mongoose.model('ProductReview', reviewSchema);

module.exports = { Notification, ProductReview };