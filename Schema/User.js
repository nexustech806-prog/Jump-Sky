const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    nickname: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: 'Personagem.png' } // <- novo campo
});

const User = mongoose.model('User', userSchema);


module.exports = User;
