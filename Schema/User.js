const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    nickname: { type: String, required: true },
    // Legacy accounts can contain duplicate nicknames. Only new registrations
    // populate this key, so their unique index does not alter existing accounts.
    registrationNickname: { type: String, unique: true, sparse: true, select: false },
    password: { type: String, required: true },
    avatar: { type: String, default: 'Personagem.png' } // <- novo campo
});

const User = mongoose.model('User', userSchema);


module.exports = User;
