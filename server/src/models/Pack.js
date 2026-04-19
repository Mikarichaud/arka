const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const packSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  theme: {
    type: String,
    enum: ['marseillais', 'amis', 'sportif', 'couple', 'enfants', 'custom'],
    default: 'custom',
  },
  isOfficial: { type: Boolean, default: false },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  challenges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }],
  shareCode: { type: String, unique: true, sparse: true },
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

packSchema.pre('save', async function () {
  if (!this.shareCode) {
    this.shareCode = nanoid(8).toUpperCase();
  }
});

module.exports = mongoose.model('Pack', packSchema);
