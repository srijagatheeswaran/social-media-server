const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Token = require('../models/Token');
const authMiddleware = require('../middleware/authMiddleware');
const sendEmail = require("../utils/sendEmail");
const crypto = require('crypto');




const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Register User & Send OTP
router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;
    console.log(req.body)
    console.log(username, email, password);
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already exists" });

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        // Save User with OTP
        const user = new User({ username, email, password: hashedPassword, otp, otpExpires });
        await user.save();

        try {
            await sendEmail(email, "Verify Your Email", `Your OTP is: ${otp}`);
        } catch (emailError) {
            console.error("Email sending error:", emailError.message);

            await User.deleteOne({ _id: user._id });

            return res.status(404).json({ message: emailError.message });
        }

        res.status(200).json({ message: "OTP sent to email", email });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error registering user" });
    }
});



// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid User' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        if (!user.isVerified) {
            const otp = crypto.randomInt(100000, 999999).toString();
            user.otp = otp;
            user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();

            await sendEmail(user.email, "Verify Your Email", `Your OTP is: ${otp}`);

            return res.status(403).json({ message: "Please verify your email first. OTP sent!", email });
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET);

        await Token.findOneAndUpdate(
            { userId: user._id },
            { token },
            { upsert: true }
        );



        res.status(200).json({ message: 'Login successful!', token, email,"id":user._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email not found in cookies" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        if (user.otp !== otp || user.otpExpires < new Date()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "100d" }
        );


        await Token.findOneAndUpdate(
            { userId: user._id },
            { token },
            { upsert: true }
        );


        res.status(200).json({ message: "User verified successfully", token,"id":user._id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error verifying OTP" });
    }
});

router.post("/verify", async (req, res) => {
    const clientToken = req.headers.authorization?.split(" ")[1];
    const { email } = req.body;

    if (!email || !clientToken) {
        return res.status(400).json({ valid: false, message: "Email or token missing" });
    }

    try {
        // 1. Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ valid: false, message: "User not found" });
        }

        // 2. Fetch token by user ID
        const tokenDoc = await Token.findOne({ userId: user._id });
        if (!tokenDoc) {
            return res.status(404).json({ valid: false, message: "Token not found" });
        }

        // 3. Compare stored token with request token
        if (tokenDoc.token !== clientToken) {
            return res.status(401).json({ valid: false, message: "Token mismatch" });
        }

        return res.status(200).json({ valid: true });
    } catch (error) {
        console.error("Token verify error:", error);
        return res.status(500).json({ valid: false, message: "Server error" });
    }
});

// Logout Route
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        await Token.deleteOne({ token: req.headers.token });
        res.status(200).json({ message: 'Logged out successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});



module.exports = router;
