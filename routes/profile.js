const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follower');
const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });
const upload = multer({ storage: multer.memoryStorage() });

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Cloudinary config
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const router = express.Router();

// router.post('/uploadImage', upload.single('image'), async (req, res) => {
//     const { email } = req.body;
//     const file = req.file;

//     if (!file) {
//         return res.status(400).json({ message: "No image file uploaded" });
//     }

//     try {
//         const user = await User.findOne({ email });

//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         // Wrap cloudinary upload in a Promise to use await
//         const result = await new Promise((resolve, reject) => {
//             const uploadStream = cloudinary.uploader.upload_stream(
//                 {
//                     folder: "user_profiles",
//                     public_id: `${email}_profile`,
//                     overwrite: true,
//                 },
//                 (error, result) => {
//                     if (error) reject(error);
//                     else resolve(result);
//                 }
//             );

//             streamifier.createReadStream(file.buffer).pipe(uploadStream);
//         });

//         // Save URL to user's profileImage
//         user.profileImage = result.secure_url;
//         await user.save();

//         res.status(200).json({
//             message: "Image uploaded",
//             imageUrl: result.secure_url,
//         });

//     } catch (err) {
//         console.error("Upload error:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// });
// router.post('/uploadImage', upload.single('image'), (req, res) => {
//     const { email } = req.body;
//     const file = req.file;

//     if (!file) return res.status(400).json({ message: "Image not uploaded." });

//     const imageUrl = `/uploads/${file.filename}`;
//     return res.status(200).json({ message: "Image uploaded", imageUrl });
// });


router.post('/uploadImage', upload.single('image'), async (req, res) => {
    const { email } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: "No image file uploaded" });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete old image from Cloudinary if exists
        if (user.profileImage) {
            const oldPublicId = getPublicIdFromUrl(user.profileImage);
            if (oldPublicId) {
                await cloudinary.uploader.destroy(oldPublicId);
            }
        }

        // Upload new image
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "user_profiles",
                    public_id: `${email}_profile`, // optional: generate unique id if needed
                    overwrite: true,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });

        // Update user with new image URL
        user.profileImage = result.secure_url;
        await user.save();

        res.status(200).json({
            message: "Image uploaded",
            imageUrl: result.secure_url,
        });

    } catch (err) {
        console.error("Upload error:", err);
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

router.get('/show', authenticateToken, async (req, res) => {
    try {

        const email = req.headers.email;
        // console.log(email);

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userPosts = await Post.find({ userId: req.user.id });

        const postCount = userPosts.length;
        const followersCount = await Follow.countDocuments({ followId: user._id });

        const followingCount = await Follow.countDocuments({ followerId: user._id });
        res.status(200).json({
            name: user.username,
            email: user.email,
            image: user.profileImage,
            bio: user.bio,
            gender: user.gender,
            postCount,
            followersCount,
            followingCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


// router.post('/uploadImage', upload.single('image'), (req, res) => {
//     try {
//         const email = req.headers.email;
//         const file = req.image;
//         console.log("File from request:", req);


//         if (!file || !email) {
//             return res.status(400).json({ message: "Image and email are required." });
//         }

//         const imageUrl = `/uploads/${file.filename}`; // public path to serve

//         // Save imageUrl to DB for this email if needed...

//         return res.status(200).json({
//             message: 'Image uploaded successfully',
//             imageUrl
//         });

//     } catch (error) {
//         console.error("Upload error:", error);
//         return res.status(500).json({ message: "Server error" });
//     }
// });

router.post('/updateUser', authenticateToken, async (req, res) => {
    try {
        const { email, name, gender, bio } = req.body;

        // console.log("Request body:", email, name,gender, bio);
        // console.log(req.body);

        // Validate input
        if (!email) {
            return res.status(400).json({ message: 'Email is required to update user details.' });
        }
        // return 

        const updatedFields = {};
        if (name) updatedFields.username = name;
        if (gender) updatedFields.gender = gender;
        if (bio) updatedFields.bio = bio;

        if (Object.keys(updatedFields).length === 0) {
            return res.status(400).json({ message: 'No fields provided to update.' });
        }

        if (name) {
            const existingUser = await User.findOne({ username: name });
            if (existingUser && existingUser.email !== email) {
                return res.status(400).json({ message: 'Username is already taken.' });
            }
        }

        const updatedUser = await User.findOneAndUpdate(
            { email },
            { $set: updatedFields },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ message: 'Details updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get("/search", authenticateToken, async (req, res) => {
    const { query } = req.query;
    const authUserId = req.user.id;
    if (!query) return res.status(400).json({ message: "Query is required" });

    try {
        const users = await User.find({
            username: { $regex: query, $options: "i" },
            _id: { $ne: authUserId }
        });

        res.status(200).json({ users });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


router.get("/user-details", async (req, res) => {
    const { email } = req.query;
    const viewerEmail = req.headers.email;


    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!viewerEmail) return res.status(400).json({ message: "Viewer email is required" });

    try {
        const user = await User.findOne({ email }).lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        const viewerUser = await User.findOne({ email: viewerEmail });
        if (!viewerUser) return res.status(404).json({ message: "Viewer not found" });

        // Check if a follow relationship exists in Follower table
        const isFollow = await Follow.exists({
            followId: user._id,
            followerId: viewerUser._id,
        });

        const followersCount = await Follow.countDocuments({ followId: user._id });

        const followingCount = await Follow.countDocuments({ followerId: user._id });

        const postsCount = await Post.countDocuments({ userId: user._id });

        res.status(200).json({
            user,
            isFollow: !!isFollow,
            followersCount,
            followingCount,
            postsCount
        });
    } catch (error) {
        console.error("Fetch user details error:", error);
        res.status(500).json({ message: "Server error" });
    }
});





module.exports = router;