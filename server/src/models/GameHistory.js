const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  players: [{ type: String }],
  packUsed: { type: String },
  totalRounds: { type: Number, default: 0 },
  highlights: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('GameHistory', gameHistorySchema);
