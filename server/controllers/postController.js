const Post = require("../models/Post");

// GET ALL POSTS
exports.getPosts = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const posts = await Post.find(filter).sort({ publishedAt: -1 });

    res.json({
      items: posts,
    });
  } catch (error) {
    res.status(500).json({
      message: "Không lấy được bài viết",
    });
  }
};

// GET POST BY SLUG
exports.getPostBySlug = async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { slug: req.params.slug },
      { $inc: { views: 1 } },
      { new: true },
    );

    if (!post) {
      return res.status(404).json({
        message: "Không tìm thấy bài viết",
      });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi lấy bài viết",
    });
  }
};

// CREATE POST
exports.createPost = async (req, res) => {
  try {
    console.log("POST BODY:", req.body);

    const post = new Post(req.body);

    await post.save();

    res.status(201).json(post);
  } catch (error) {
    console.error("CREATE POST ERROR:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

// UPDATE POST
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json(post);
  } catch (error) {
    res.status(500).json({
      message: "Cập nhật thất bại",
    });
  }
};

// DELETE POST
exports.deletePost = async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);

    res.json({
      message: "Đã xoá bài viết",
    });
  } catch (error) {
    res.status(500).json({
      message: "Xoá thất bại",
    });
  }
};
