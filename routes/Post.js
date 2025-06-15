const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
const Post = require('../models/Post');
const User = require("../models/User");


router.post("/store", authenticateToken, async (req, res) => {

    try {
        const { title, image } = req.body;

        const newPost = new Post({
            title: title,
            media: image,
            userId: req.user.id
        });
        await newPost.save();
        res.status(200).json({ message: "Post created successfully", post: newPost });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/list", authenticateToken, async (req, res) => {

    try {
        const Posts = await Post.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ message: "Post fetched successfully", Posts: Posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/view", authenticateToken, async (req, res) => {
    try {
        const { post_id } = req.body;
        console.log(post_id);
        if (!post_id) {
            return res.status(400).json({ message: "Post ID is required" });
        }

        const post = await Post.find({ id: req.post_id });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        return res.status(200).json({ message: "Post fetched successfully", Posts: post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

router.delete("/delete", authenticateToken, async (req, res) => {
    try {
        const { post_id } = req.body;
        console.log(post_id);
        if (!post_id) {
            return res.status(400).json({ message: "Post ID is required" });
        }

        const post = await Post.findByIdAndDelete(post_id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        return res.status(200).json({ message: "Post deleted successfully", Posts: post });
        // return res.status(200).json({ message: "Post deleted successfully", Posts: ""});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }

});

router.get("/", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const viewerEmail = req.headers.email;

    try {
        let viewerUserId = null;

        if (viewerEmail) {
            const viewer = await User.findOne({ email: viewerEmail }).select("_id");
            if (viewer) {
                viewerUserId = viewer._id;
            }
        }

        const filter = viewerUserId
            ? { userId: { $ne: viewerUserId } } // Exclude user's own posts
            : {}; // If no viewer, show all posts

        const totalPosts = await Post.countDocuments(filter);
        const posts = await Post.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("userId", "username email profileImage")
            .lean();

        res.status(200).json({
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts,
            posts,
        });
    } catch (error) {
        console.error("Fetch posts error:", error);
        res.status(500).json({ message: "Server error" });
    }
});




module.exports = router;