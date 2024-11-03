const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,

    },
    gender: {
        type: String, enum: ['male', 'female', 'other']
    },
    bio: { type: String },
    token: { type: String },

});
module.exports = mongoose.model('users', userSchema);
