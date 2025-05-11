const express = require('express');
const authenticateToken = require('../middleware/authMiddleware'); 
const User = require('../models/User');


const router = express.Router();

router.get('/show',authenticateToken, async (req, res) => {
    try {
        
        const email= req.headers.email;
        // console.log(email);

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // const userPosts = await Post.find({ email });

        // const postCount = userPosts.length;
        // const followersCount = userPosts.reduce((acc, post) => acc + post.followers.length, 0);
        // const followingCount = userPosts.reduce((acc, post) => acc + post.following.length, 0);
        res.status(200).json({
            name: user.username,
            email: user.email,
            image: user.profileImage,
            bio: user.bio,
            gender: user.gender,
            // postCount,
            // followersCount,
            // followingCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/uploadImage',authenticateToken, async (req, res) => {
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
router.post('/updateUser',authenticateToken, async (req, res) => {
    try {
        const { email, name, gender, bio } = req.body;

        // Validate input
        if (!email) {
            return res.status(400).json({ message: 'Email is required to update user details.' });
        }

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


module.exports = router;