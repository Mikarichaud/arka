require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../src/models/Category');

const DEFAULTS = [
  { slug: 'marseillais', name: 'Marseillais', icon: 'anchor', order: 1 },
  { slug: 'amis',        name: 'Amis',        icon: 'party',  order: 2 },
  { slug: 'sportif',     name: 'Sport',       icon: 'football', order: 3 },
  { slug: 'couple',      name: 'Couple',      icon: 'heart',  order: 4 },
  { slug: 'enfants',     name: 'Enfants',     icon: 'balloon', order: 5 },
  { slug: 'custom',      name: 'Perso',       icon: 'pencil', order: 99 },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const def of DEFAULTS) {
    const exists = await Category.findOne({ slug: def.slug });
    if (exists) {
      console.log(`= ${def.slug} (déjà présente)`);
    } else {
      await Category.create(def);
      console.log(`+ ${def.slug} (créée)`);
    }
  }
  await mongoose.disconnect();
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
