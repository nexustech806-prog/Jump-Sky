const mongoose = require('mongoose');

const saveSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        ref: 'User' 
    },
    saveProgress: { 
        type: Number, 
        default: 1 
    }
});

const SaveData = mongoose.model('SaveData', saveSchema);

module.exports = SaveData;