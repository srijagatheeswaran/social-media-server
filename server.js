const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const http = require('http');
const profileRoutes = require('./routes/profile');
const messageRoutes = require('./routes/message');
const followRoutes = require('./routes/follow');
const { Server } = require("socket.io");
const Message = require('./models/Message');

dotenv.config();

const app = express();
connectDB();

app.use(cors({
    origin: "http://localhost:3001",
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/posts', require('./routes/Post'));
app.use('/follow', followRoutes);
app.use('/messages', messageRoutes);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// ✅ Use this consistently
const userSocketMap = {};

io.on("connection", (socket) => {
    console.log("✅ New socket connected:", socket.id);

    // Register user to socket
    socket.on("register_user", (userId) => {
        userSocketMap[userId] = socket.id;
        console.log("🟢 User registered:", userId);
        console.log("🗺️ Current userSocketMap:", userSocketMap);
    });

    // Handle message sending
    socket.on("send_message", async (msg) => {
        try {
            const saved = await new Message({
                sender: msg.senderId,
                receiver: msg.receiverId,
                content: msg.content,
                timestamp: msg.timestamp || Date.now(),
            }).save();

            const populated = await Message.findById(saved._id)
                .populate("sender", "_id username")
                .populate("receiver", "_id username");

            const receiverSocketId = userSocketMap[msg.receiverId];
            const senderSocketId = userSocketMap[msg.senderId];

            if (receiverSocketId) {
                io.to(receiverSocketId).emit("private_message", populated);
            }
            if (senderSocketId && senderSocketId !== receiverSocketId) {
                io.to(senderSocketId).emit("private_message", populated);
            }
        } catch (err) {
            console.error("❌ Error sending message:", err);
        }
    });


    // Cleanup disconnected user
    socket.on("disconnect", () => {
        for (const [userId, socketId] of Object.entries(userSocketMap)) {
            if (socketId === socket.id) {
                delete userSocketMap[userId];
                console.log("🔌 User disconnected:", userId);
                break;
            }
        }
    });
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
