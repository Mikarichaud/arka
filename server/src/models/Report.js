const mongoose = require('mongoose');

// Signalement de contenu (UGC). V1 : médias des salons uniquement.
// Modération owner-only via le dashboard /admin (onglet Signalements).
const reportSchema = new mongoose.Schema({
  salonCode: { type: String, required: true, index: true },
  mediaUrl: { type: String, required: true },
  targetPseudo: { type: String, default: null },        // pseudo de l'uploadeur présumé
  reporterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reporterPseudo: { type: String, default: null },
  reason: { type: String, default: null, maxlength: 300 },
  status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending', index: true },
  resolution: { type: String, enum: ['media-deleted', 'dismissed', null], default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
