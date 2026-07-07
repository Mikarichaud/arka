const mongoose = require('mongoose');

// Emplacements de stickers. L'ID (spotN) est gravé dans le QR et ne change jamais ;
// le quartier (label) est mappé/modifiable en Admin. Les spots sont créés/supprimés
// dynamiquement depuis l'Admin → on peut générer de nouveaux stickers à volonté.
const tourneeSpotSchema = new mongoose.Schema({
  spot: { type: String, required: true, unique: true }, // ex: 'spot1'
  label: { type: String, default: '' },                 // quartier (configurable)
  scans: { type: Number, default: 0 },
  appClicks: { type: Number, default: 0 },              // clics « Télécharger l'app »
  signups: { type: Number, default: 0 },                // inscriptions réellement complétées
}, { timestamps: true });

const TourneeSpot = mongoose.model('TourneeSpot', tourneeSpotSchema);

// Crée 4 spots de départ si la collection est vide (premier affichage Admin).
TourneeSpot.seedDefaultsIfEmpty = async function () {
  if (await this.countDocuments() === 0) {
    await this.insertMany([1, 2, 3, 4].map((i) => ({ spot: `spot${i}`, label: `Sticker ${i}` })));
  }
};

// Prochain ID séquentiel disponible (spotN), robuste aux suppressions.
TourneeSpot.nextSpotId = async function () {
  const all = await this.find({ spot: /^spot\d+$/ }).select('spot').lean();
  const max = all.reduce((m, s) => Math.max(m, parseInt(s.spot.slice(4), 10) || 0), 0);
  return `spot${max + 1}`;
};

module.exports = TourneeSpot;
