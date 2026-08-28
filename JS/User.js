const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true },
  password: { type: String, required: true },
  confirmpassword: { type: String, rquired: true}
});

const User = mongoose.model('User', userSchema);


module.exports = User;