const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    email: { type: String, required: true }, 
    post: { type: String, required: true },   
    followers: [{ type: String }],           
    following: [{ type: String }]             
});

module.exports = mongoose.model('post', postSchema);