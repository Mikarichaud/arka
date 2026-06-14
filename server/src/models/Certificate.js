const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Le certificat de Permis Marseillais : 1 par utilisateur, mis à jour si le record est battu.
// attemptsRemaining = compteur d'essais payés (crédité par Stripe web OU Apple IAP).
const certificateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    pseudo: { type: String },
    postalCode: { type: String, default: null },
    provenanceZone: { type: String, default: null },

    attemptsRemaining: { type: Number, default: 0 },
    attemptsTaken: { type: Number, default: 0 },

    bestScore: { type: Number, default: null }, // 0–20
    mention: { type: String, default: null },
    passed: { type: Boolean, default: false },

    publicCode: { type: String, unique: true, sparse: true }, // /certificat/:code, généré à la 1re émission
    issuedAt: { type: Date, default: null },
    recordAt: { type: Date, default: null },
    lastTrialAt: { type: Date, default: null }, // quota 1×/jour du test blanc

    history: [
      {
        score: Number,
        mode: { type: String, enum: ['exam'], default: 'exam' },
        takenAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Récupère le certificat de l'user, le crée à la volée s'il n'existe pas encore.
certificateSchema.statics.getOrCreateForUser = async function (user) {
  let cert = await this.findOne({ userId: user._id });
  if (!cert) {
    const { getProvenance } = require('../utils/provenance');
    const prov = getProvenance(user.postalCode);
    cert = await this.create({
      userId: user._id,
      pseudo: user.username,
      postalCode: user.postalCode || null,
      provenanceZone: prov?.zone || null,
    });
  }
  return cert;
};

certificateSchema.methods.ensurePublicCode = function () {
  if (!this.publicCode) this.publicCode = nanoid(10);
  return this.publicCode;
};

module.exports = mongoose.model('Certificate', certificateSchema);
