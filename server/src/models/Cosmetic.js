const mongoose = require('mongoose');

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CATEGORIES = [
  'roulette',
  'needle',
  'cochonnet',
  'avatar-frame',
  'badge',
  'background',
  'sound-pack',
  'endgame-anim',
];

const cosmeticSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true },
  category: { type: String, required: true, enum: CATEGORIES },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  priceCents: { type: Number, required: true, min: 0 },
  // IDs Stripe générés automatiquement à la création / changement de prix
  stripeProductId: { type: String, default: null },
  stripePriceId: { type: String, default: null },
  // Donnée libre selon catégorie : palette pour roulette, URL audio pour sounds, etc.
  asset: { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
  publishAt: { type: Date, default: null },
}, { timestamps: true });

cosmeticSchema.pre('validate', function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
});

cosmeticSchema.statics.CATEGORIES = CATEGORIES;
cosmeticSchema.statics.slugify = slugify;

module.exports = mongoose.model('Cosmetic', cosmeticSchema);
