const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follower');



const router = express.Router();

router.post('/store', authenticateToken, async (req, res) => {
    try {
        const followerId = req.user.id;
        const email = req.headers.email;
        const followId = req.body.user_id;


        const existingFollow = await Follow.findOne({
            followId: followId,
            followerId: followerId
        });
        console.log(followerId, followId);
        if (existingFollow) {
            // Unfollow (remove)
            await Follow.deleteOne({ _id: existingFollow._id });
            return res.status(200).json({ message: 'Unfollowed successfully' });
        } else {
            // Follow (create)
            const newFollow = new Follow({ followId, followerId });
            await newFollow.save();
            return res.status(200).json({ message: 'Followed successfully' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/list', authenticateToken, async (req, res) => {
    try {
        const followerId = req.user.id;
        const email = req.headers.email;

        // Fetch all users that the current user follows
        const following = await Follow.find({ followerId: followerId }).populate('followId', 'name email');

        // Fetch all posts from the followed users
        const followedUserIds = following.map(f => f.followId._id);
        const posts = await Post.find({ userId: { $in: followedUserIds } }).sort({ createdAt: -1 }).populate('userId', 'name email');

        res.status(200).json({ message: 'Followed users and their posts fetched successfully', following, posts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});







module.exports = router;