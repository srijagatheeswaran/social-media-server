const jwt = require('jsonwebtoken');
const Token = require('../models/Token');
const User = require('../models/User'); // Import User model

const authMiddleware = async (req, res, next) => {
    try {
        const email = req.headers.email;
        // console.log("email",email)
        if (!email) {
            return res.status(401).json({ message: 'Unauthorized: No email provided' });
        }

        // Check if the user exists and is verified
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'User not verified' });
        }

        // Now check for the token
        const token = req.headers.token;
        // console.log(token)
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const existingToken = await Token.findOne({ token });
        if (!existingToken) {
            return res.status(401).json({ message: 'Invalid Token' });
        }

        req.user = decoded; 
        next()
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Invalid or Expired Token' });
    }
};

module.exports = authMiddleware;
