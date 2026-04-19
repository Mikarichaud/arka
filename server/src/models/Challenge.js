const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  intensity: {
    level: { type: Number, enum: [1, 2, 3], default: 1 },
    label: { type: String, enum: ['Facile', 'Moyen', 'Hard'], default: 'Facile' },
    color: { type: String, default: '#2DC653' },
  },
  category: { type: String, default: 'general' },
  pack: { type: mongoose.Schema.Types.ObjectId, ref: 'Pack' },
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);
