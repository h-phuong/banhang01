const Category = require('../models/Category');
const Product = require('../models/Product');
const slugify = require('slugify');

// 1. Lấy tất cả danh mục (Phẳng - Frontend sẽ tự xử lý hiển thị cây)
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Lấy chi tiết 1 danh mục
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).populate('parentId', 'name');
        if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Tạo danh mục mới
exports.createCategory = async (req, res) => {
    try {
        const { name, parentId } = req.body;

        // Tự động tạo slug từ tên
        const slug = slugify(name, { lower: true, locale: 'vi' });

        const newCategory = new Category({
            name,
            slug,
            parentId: parentId || null // Nếu rỗng thì là danh mục gốc
        });

        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory);
    } catch (error) {
        // Lỗi trùng lặp Slug (code 11000)
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Tên danh mục (slug) đã tồn tại' });
        }
        res.status(400).json({ message: error.message });
    }
};

// 4. Cập nhật danh mục
exports.updateCategory = async (req, res) => {
    try {
        const { name, parentId, isActive } = req.body;
        const categoryId = req.params.id;

        // Kiểm tra logic: Không thể chọn chính mình làm cha
        if (parentId === categoryId) {
            return res.status(400).json({ message: 'Danh mục cha không hợp lệ' });
        }

        const updateData = {
            name,
            parentId: parentId || null,
            isActive
        };

        // Nếu có đổi tên thì đổi luôn Slug
        if (name) {
            updateData.slug = slugify(name, { lower: true, locale: 'vi' });
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId, 
            updateData, 
            { new: true } // Trả về data mới sau update
        );

        if (!updatedCategory) return res.status(404).json({ message: 'Không tìm thấy danh mục' });
        res.status(200).json(updatedCategory);

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 5. Xóa danh mục
exports.deleteCategory = async (req, res) => {
    try {
        // Kiểm tra xem có sản phẩm nào thuộc danh mục này không
        const hasProducts = await Product.exists({ categoryId: req.params.id });
        if (hasProducts) {
            return res.status(400).json({ message: 'Không thể xóa danh mục đang chứa sản phẩm' });
        }

        // Kiểm tra xem có danh mục con không
        const hasChildren = await Category.exists({ parentId: req.params.id });
        if (hasChildren) {
            return res.status(400).json({ message: 'Hãy xóa hoặc di chuyển các danh mục con trước' });
        }

        await Category.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Xóa danh mục thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};