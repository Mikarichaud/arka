const mongoose = require('mongoose');

const packSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  // theme = slug de Category. Validation contre Category côté route, pas d'enum hardcodé.
  theme: { type: String, default: 'custom', trim: true },
  isOfficial: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  challenges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }],
  shareCode: { type: String, unique: true, sparse: true },
  coverImage: { type: String, default: null },
  isPublic: { type: Boolean, default: false },
  // Brouillon / programmation — affecte uniquement les packs officiels côté public
  isActive: { type: Boolean, default: true },
  publishAt: { type: Date, default: null },
}, { timestamps: true });

// shareCode n'est plus généré automatiquement : la route POST /packs décide
// de le créer selon le tier de l'auteur.

module.exports = mongoose.model('Pack', packSchema);
