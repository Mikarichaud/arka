const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: null },
  postalCode: { type: String, default: null }, // code postal français (5 chiffres), pour le badge de provenance
  tier: { type: String, enum: ['free', 'premium'], default: 'free' },
  role: { type: String, enum: ['user', 'gate'], default: 'user' },
  subscription: {
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    status: { type: String, enum: ['active', 'canceled', 'past_due', 'trialing', 'unpaid', 'incomplete', 'incomplete_expired', null], default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  purchasedPacks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pack' }],
  purchasedSkins: [{ type: String }], // slugs de Cosmetic possédés
  activeSkins: { type: Map, of: String, default: {} }, // category -> slug actif
  stats: {
    totalGames: { type: Number, default: 0 },
    totalChallengesCompleted: { type: Number, default: 0 },
    totalChallengesRefused: { type: Number, default: 0 },
  },
  customPacks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pack' }],
  lastSeenAt: { type: Date, default: null }, // dernière activité (login + requêtes authentifiées, throttlé)
  // Reset password : on stocke le HASH du token (jamais le token en clair).
  // select: false pour qu'ils ne sortent jamais via User.find() classique.
  passwordResetTokenHash: { type: String, default: null, select: false },
  passwordResetExpiresAt: { type: Date, default: null, select: false },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isPremiumActive = function () {
  // Mode lancement : si FEATURES_UNLOCKED=true, tout le monde a l'équivalent Premium.
  // Flipper la var à false (ou la retirer) pour refermer le freemium.
  if (process.env.FEATURES_UNLOCKED === 'true') return true;
  // Les Gatés (rôle admin du site) ont l'équivalent Premium en permanence :
  // accès à tout le contenu, création illimitée de packs/salons, upload média/avatar.
  // Ça évite de leur faire payer un abonnement pour gérer leur propre instance.
  if (this.role === 'gate') return true;
  if (this.tier !== 'premium') return false;
  if (!this.subscription?.currentPeriodEnd) return false;
  return new Date() < new Date(this.subscription.currentPeriodEnd);
};

// Owner = super-admin (toi, le propriétaire de l'instance). Match par email,
// configuré via OWNER_EMAIL en env. Donne accès au /admin dashboard.
userSchema.methods.isOwner = function () {
  return !!process.env.OWNER_EMAIL && this.email === process.env.OWNER_EMAIL.toLowerCase();
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject({ flattenMaps: true });
  delete obj.password;
  // Flag virtuel : permet au client de conditionner l'affichage du lien Admin
  obj.isOwner = this.isOwner();
  return obj;
};

module.exports = mongoose.model('User', userSchema);
