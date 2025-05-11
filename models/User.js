const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true  
    },
    password: {
        type: String,
        required: true
    },
    profileImage: {
        type: String, 
        default: ""  
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: null
    },
    bio: {
        type: String,
        trim: true,
        default: "",  
        maxlength: [200, "Bio cannot exceed 200 characters"] 
    },
    isVerified: { type: Boolean, default: false },
    otp: String, 
    otpExpires: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
