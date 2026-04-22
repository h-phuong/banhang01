const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Image = require('../models/Image');
const Product = require('../models/Product');
const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Sử dụng memory storage cho multer (không lưu local)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /jpg|jpeg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)!');
        }
    },
});

// API Upload: POST /api/upload
router.post('/', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'Vui lòng chọn file' });
    }

    try {
        // Upload ảnh lên Cloudinary
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'webthoitrang', // Thư mục trên Cloudinary
                    public_id: `${Date.now()}-${req.file.originalname.split('.')[0]}`,
                    resource_type: 'image',
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(req.file.buffer);
        });

        // Lưu thông tin ảnh vào database
        const newImage = new Image({
            filename: result.public_id,
            imagePath: result.secure_url,
            originalName: req.file.originalname,
            fileSize: result.bytes,
            mimeType: req.file.mimetype
        });
        
        await newImage.save();
        
        res.send({
            imagePath: result.secure_url,
            imageId: newImage._id,
            message: 'Upload thành công!'
        });
    } catch (err) {
        console.error('Lỗi upload Cloudinary:', err);
        res.status(500).send({ message: 'Lỗi upload ảnh' });
    }
});

    // API Save Cloudinary-uploaded image record: POST /api/upload/cloud
    router.post('/cloud', async (req, res) => {
        try {
            const { url, publicId, originalName, size, mimeType } = req.body;

            if (!url) return res.status(400).json({ success: false, message: 'Missing url' });

            const newImage = new Image({
                filename: publicId || url.split('/').slice(-1)[0],
                imagePath: url,
                originalName: originalName || '',
                fileSize: size || 0,
                mimeType: mimeType || ''
            });

            await newImage.save();

            res.json({ success: true, data: newImage, message: 'Saved cloud image' });
        } catch (err) {
            console.error('Lỗi lưu cloud image:', err);
            res.status(500).json({ success: false, message: 'Lỗi lưu image' });
        }
    });

// API Lấy danh sách ảnh đã upload: GET /api/upload
router.get('/', async (req, res) => {
    try {
        const images = await Image.find({ isActive: true })
            .sort({ uploadedAt: -1 })
            .select('_id filename imagePath originalName fileSize uploadedAt');
        
        res.json({
            success: true,
            data: images,
            count: images.length
        });
    } catch (err) {
        console.error('Lỗi:', err);
        res.status(500).json({ success: false, message: 'Lỗi lấy danh sách ảnh' });
    }
});

// API Xóa ảnh: DELETE /api/upload/:id
router.delete('/:id', async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        
        if (!image) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
        }
        
        // Prepare possible URL variants (relative and absolute)
        const relativePath = image.imagePath; // may be '/uploads/xxx' or a full URL
        const hostBase = `${req.protocol}://${req.get('host')}`;
        const absolutePath = relativePath && relativePath.startsWith('/') ? `${hostBase}${relativePath}` : relativePath;

        // Remove references from products: clear thumbnail if matches, and pull from images array
        try {
            await Product.updateMany(
                { thumbnail: { $in: [relativePath, absolutePath] } },
                { $set: { thumbnail: '' } }
            );

            await Product.updateMany(
                { 'images.imageUrl': { $in: [relativePath, absolutePath] } },
                { $pull: { images: { imageUrl: { $in: [relativePath, absolutePath] } } } }
            );
        } catch (e) {
            console.error('Lỗi khi cập nhật sản phẩm để xóa tham chiếu ảnh:', e);
            // continue deletion even if product update fails
        }

        // Xóa ảnh từ Cloudinary
        try {
            if (image.filename) {
                await cloudinary.uploader.destroy(image.filename);
            }
        } catch (e) {
            console.warn('Không thể xóa ảnh từ Cloudinary:', e);
        }

        // Xóa từ database
        await Image.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Đã xóa ảnh và xóa tham chiếu trên sản phẩm' });
    } catch (err) {
        console.error('Lỗi:', err);
        res.status(500).json({ success: false, message: 'Lỗi xóa ảnh' });
    }
});

module.exports = router;