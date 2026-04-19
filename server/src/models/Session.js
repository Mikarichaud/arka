const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const sessionSchema = new mongoose.Schema({
  players: [{
    name: { type: String, required: true },
    score: { type: Number, default: 0 },
    avatar: { type: String, default: null },
  }],
  pack: { type: mongoose.Schema.Types.ObjectId, ref: 'Pack', required: true },
  currentPlayerIndex: { type: Number, default: 0 },
  currentSpinResult: { type: Number, default: null },
  status: { type: String, enum: ['setup', 'playing', 'finished'], default: 'setup' },
  history: [{
    playerName: { type: String, required: true },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', default: null },
    challengeText: { type: String, default: '' },
    result: { type: String, enum: ['completed', 'refused', 'pending'], default: 'pending' },
    points: { type: Number, default: 0 },
    media: [{ type: String }],
    timestamp: { type: Date, default: Date.now },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  shareLink: { type: String, unique: true, sparse: true },
}, { timestamps: true });

sessionSchema.pre('save', async function () {
  if (!this.shareLink) {
    this.shareLink = nanoid(10);
  }
});

module.exports = mongoose.model('Session', sessionSchema);
