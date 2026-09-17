const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    nickname: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String, default: 'personagem.png' } // <- novo campo
});

const User = mongoose.model('User', userSchema);


module.exports = User;