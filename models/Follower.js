const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    followId: { type: String, ref: 'User', required: true },
    followerId: { type: String, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Follower', followSchema);
