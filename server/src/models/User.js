const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: null },
  tier: { type: String, enum: ['free', 'premium'], default: 'free' },
  subscription: {
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    status: { type: String, enum: ['active', 'canceled', 'past_due', null], default: null },
    currentPeriodEnd: { type: Date, default: null },
  },
  purchasedPacks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pack' }],
  purchasedSkins: [{ type: String }],
  stats: {
    totalGames: { type: Number, default: 0 },
    totalChallengesCompleted: { type: Number, default: 0 },
    totalChallengesRefused: { type: Number, default: 0 },
  },
  customPacks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pack' }],
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isPremiumActive = function () {
  if (this.tier !== 'premium') return false;
  if (!this.subscription?.currentPeriodEnd) return false;
  return new Date() < new Date(this.subscription.currentPeriodEnd);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
