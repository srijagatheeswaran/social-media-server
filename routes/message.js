const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follower');

const Message = require('../models/Message');

const router = express.Router();

router.get('/list', authenticateToken, async (req, res) => {
   try {
    const userId = req.user.id;

    const messages = await Message.find({
        $or: [{ sender: userId }, { receiver: userId }]
    })
        .populate('sender', 'username email profileImage')
        .populate('receiver', 'username email profileImage')
        .sort({ timestamp: -1 }); 

    const userMap = new Map(); 

    for (const msg of messages) {
        if (!msg.sender || !msg.receiver) continue;
        const isSender = msg.sender._id.toString() === userId;
        const otherUser = isSender ? msg.receiver : msg.sender;

        if (!otherUser || !otherUser._id) continue; 

        const otherUserId = otherUser._id.toString();

        if (!userMap.has(otherUserId)) {
            userMap.set(otherUserId, {
                user: {
                    _id: otherUser._id,
                    username: otherUser.username,
                    email: otherUser.email,
                    profileImage: otherUser.profileImage,
                },
                lastMessage: msg.content,
                timestamp: msg.timestamp,
            });
        }
    }

    const uniqueConversations = Array.from(userMap.values());

    res.status(200).json({ messages: uniqueConversations });

} catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
}

});

// GET /messages/:userId?page=1&limit=20
router.get("/:userId", authenticateToken, async (req, res) => {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    try {
        // Find the other user first
        const otherUser = await User.findById(otherUserId).select("username profileImage");

        if (!otherUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find messages
        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId },
            ],
        })
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("sender", "username profileImage")
            .populate("receiver", "username profileImage");

        if (!messages.length) {
            return res.status(200).json({
                message: "No messages found",
                messages: [],
                otherUser,
            });
        }

        res.status(200).json({ messages, otherUser });

    } catch (err) {
        console.error("Error fetching messages:", err);
        res.status(500).json({ message: "Server error" });
    }
});



module.exports = router;
