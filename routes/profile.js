const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const User = require('../models/User');
Post = require('../models/Post');
const Follow = require('../models/Follower');


const router = express.Router();

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

router.post('/uploadImage', authenticateToken, async (req, res) => {
    try {
        const { email, image } = req.body;

        if (!email || !image) {
            return res.status(400).json({ message: 'Email and image are required' });
        }

        await User.updateOne({ email }, { $set: { profileImage: image } });

        res.status(200).json({ message: 'Image uploaded successfully' });
    } catch (error) {
        console.error('Error updating image:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
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

router.get("/search",authenticateToken, async (req, res) => {
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

        res.status(200).json({
            user,
            isFollow: !!isFollow,
            followersCount,
            followingCount,
        });
    } catch (error) {
        console.error("Fetch user details error:", error);
        res.status(500).json({ message: "Server error" });
    }
});





module.exports = router;