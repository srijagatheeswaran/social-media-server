const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();
const Post = require('../models/Post');
const User = require("../models/User");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const streamifier = require("streamifier");
const { v2: cloudinary } = require("cloudinary");


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});



router.post("/store", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { title } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Image is required." });
    }

    // Cloudinary Upload
    const uploadToCloudinary = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "post_images",
            public_id: `${req.user.id}_post_${Date.now()}`,
            resource_type: "image",
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
      });

    const result = await uploadToCloudinary();

    // Save to MongoDB
    const newPost = new Post({
      title: title,
      media: result.secure_url,
      userId: req.user.id,
    });

    await newPost.save();

    res.status(200).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    console.error("Error creating post:", error);
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

// router.delete("/delete", authenticateToken, async (req, res) => {
//     try {
//         const { post_id } = req.body;
//         console.log(post_id);
//         if (!post_id) {
//             return res.status(400).json({ message: "Post ID is required" });
//         }

//         const post = await Post.findByIdAndDelete(post_id);
//         if (!post) {
//             return res.status(404).json({ message: "Post not found" });
//         }
//         return res.status(200).json({ message: "Post deleted successfully", Posts: post });
//         // return res.status(200).json({ message: "Post deleted successfully", Posts: ""});
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Server error" });
//     }

// });


router.delete("/delete", authenticateToken, async (req, res) => {
    try {
        const { post_id } = req.body;

        if (!post_id) {
            return res.status(400).json({ message: "Post ID is required" });
        }

        const post = await Post.findById(post_id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Extract public_id from media URL
        const mediaUrl = post.media;
        const publicId = getPublicIdFromUrl(mediaUrl);


        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }

        await Post.findByIdAndDelete(post_id);

        return res.status(200).json({ message: "Post deleted successfully", Posts: post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

function getPublicIdFromUrl(url) {
    if (!url) return null;
    const parts = url.split('/');
    const fileWithExtension = parts[parts.length - 1];
    const publicId = fileWithExtension.split('.')[0];
    const folder = parts[parts.length - 2]; 
    return `${folder}/${publicId}`;
}



router.get("/", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const totalPosts = await Post.countDocuments({});
        const posts = await Post.find({})
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