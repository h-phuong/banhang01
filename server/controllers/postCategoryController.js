const PostCategory = require("../models/PostCategory");

// GET ALL
exports.getCategories = async (req, res) => {
  try {
    const categories = await PostCategory.find().sort({ createdAt: -1 });

    res.json({
      items: categories,
    });
  } catch (error) {
    res.status(500).json({
      message: "Không lấy được danh mục",
    });
  }
};

// CREATE
exports.createCategory = async (req, res) => {
  try {
    const category = new PostCategory(req.body);

    await category.save();

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// DELETE
exports.deleteCategory = async (req, res) => {
  try {
    await PostCategory.findByIdAndDelete(req.params.id);

    res.json({
      message: "Đã xoá danh mục",
    });
  } catch (error) {
    res.status(500).json({
      message: "Xoá thất bại",
    });
  }
};
