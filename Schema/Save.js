const mongoose = require('mongoose');

const saveSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        ref: 'User'
    },
    saveProgress: { 
        type: Number, 
        default: 1,
        min: 1,
        max: 5,
        validate: Number.isInteger
    },
    phase4Completed: { type: Boolean, default: false },
    bonusHighScore: { type: Number, default: 0, min: 0, max: 1000000, validate: Number.isInteger }
});

const SaveData = mongoose.model('SaveData', saveSchema);

module.exports = SaveData;
