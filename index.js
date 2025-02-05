const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const dotenv = require('dotenv')
const cors = require('cors')
const User = require('./model/User')
const Post = require('./model/Post');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();
// app.use(express.json())
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
mongoose.connect(process.env.MONGODB)
    .then(() => console.log("db connect"))
    .catch((err) => console.log("db connect error" + err))

const JWT_SECRET = process.env.JWT_SECRET;
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        
        if (existingUser) {
            const message = existingUser.email === email 
                ? 'Email already exists' 
                : 'Username already exists';
            return res.status(400).json({ message });
        }


        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();

        const token = jwt.sign(
            { id: newUser._id, email: newUser.email },
            JWT_SECRET,
        );
        newUser.token = token;
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!', email, token });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: 'Server error' });
    }
});
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid User' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }
        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
        );
        user.token = token;
        await user.save();

        res.status(200).json({ message: 'Login successful!', token, email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/profile', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userPosts = await Post.find({ email });

        const postCount = userPosts.length;
        const followersCount = userPosts.reduce((acc, post) => acc + post.followers.length, 0);
        const followingCount = userPosts.reduce((acc, post) => acc + post.following.length, 0);
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

app.post('/uploadImage', async (req, res) => {
    try {
        const { email, image } = req.body; // Make sure to destructure both email and image from req.body

        // Validate if email and image are provided
        if (!email || !image) {
            return res.status(400).json({ message: 'Email and image are required' });
        }

        // Update the user's profile image in the database
        await User.updateOne({ email }, { $set: { profileImage: image } });

        res.status(200).json({ message: 'Image uploaded successfully' });
    } catch (error) {
        console.error('Error updating image:', error); // Log the error message for debugging
        res.status(500).json({ message: 'Server error' });
    }
});
app.post('/updateUser', async (req, res) => {
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

app.post('/apiVerify', async (req, res) => {
    const { email, token } = req.body;
    const isValid = await verifyTokenAndEmail(email, token);
    res.json({ isValid });
});

async function verifyTokenAndEmail(email, token) {
    const user = await User.findOne({ email, token });
    return !!user;  
}
app.get("/api/users/search", async (req, res) => {
    const { query,email} = req.query;

    try {
        
        const users = await User.find({
            username: { $regex: query, $options: "i" },
            email: { $ne: email } 
        });
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Server error" });
    }
});
// app.post('/post', async (req, res) => {
//     try {
//         const { email, image } = req.body; 

//         if (!email || !image) {
//             return res.status(400).json({ message: 'Email and image are required' });
//         }

//         await Post.updateOne({ email }, { $set: { profileImage: image } });

//         res.status(200).json({ message: 'Image uploaded successfully' });
//     } catch (error) {
//         console.error('Error updating image:', error); // Log the error message for debugging
//         res.status(500).json({ message: 'Server error' });
//     }
// });

app.listen(process.env.PORT, () => {
    console.log("server is running on port" + process.env.PORT)
})