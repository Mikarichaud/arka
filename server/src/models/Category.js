const mongoose = require('mongoose');

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  icon: { type: String, default: 'wheel' }, // nom d'icône du composant Icon
  order: { type: Number, default: 0 },
}, { timestamps: true });

categorySchema.pre('validate', function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
});

categorySchema.statics.slugify = slugify;

module.exports = mongoose.model('Category', categorySchema);
