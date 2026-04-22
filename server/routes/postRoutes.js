const express = require("express");
const router = express.Router();

const postController = require("../controllers/postController");

// GET ALL POSTS
router.get("/", postController.getPosts);

// GET POST BY SLUG
router.get("/:slug", postController.getPostBySlug);

// CREATE
router.post("/", postController.createPost);

// UPDATE
router.put("/:id", postController.updatePost);

// DELETE
router.delete("/:id", postController.deletePost);

module.exports = router;
