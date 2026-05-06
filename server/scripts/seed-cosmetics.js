require('dotenv').config();
const mongoose = require('mongoose');
const stripe = require('../src/services/stripe');
const Cosmetic = require('../src/models/Cosmetic');

const SKINS = [
  {
    slug: 'roulette-velodrome',
    category: 'roulette',
    name: 'Vélodrome',
    description: 'Le bleu OM, l\'étoile dorée, l\'âme du stade. Une roulette pour les supporters.',
    priceCents: 299,
    asset: {
      metals: [
        { hi: '#1e7fd4', base: '#0057A8', lo: '#003d7a' }, // Bleu OM clair
        { hi: '#f5f5f0', base: '#dcdcd0', lo: '#a0a098' }, // Blanc Vélodrome
        { hi: '#1e7fd4', base: '#0057A8', lo: '#003d7a' }, // Bleu OM
        { hi: '#e8c040', base: '#C9A84C', lo: '#8a6810' }, // Or étoile
        { hi: '#1e7fd4', base: '#0057A8', lo: '#003d7a' },
        { hi: '#f5f5f0', base: '#dcdcd0', lo: '#a0a098' },
        { hi: '#1e7fd4', base: '#0057A8', lo: '#003d7a' },
        { hi: '#e8c040', base: '#C9A84C', lo: '#8a6810' },
      ],
    },
  },
  {
    slug: 'roulette-calanques',
    category: 'roulette',
    name: 'Calanques',
    description: 'Turquoise des criques, blanc calcaire des falaises. La Méditerranée dans une roulette.',
    priceCents: 299,
    asset: {
      metals: [
        { hi: '#5dd5d8', base: '#2ba0a8', lo: '#0e5560' }, // Turquoise
        { hi: '#f0ebd8', base: '#c5bfa8', lo: '#85806f' }, // Calcaire
        { hi: '#3fb8c0', base: '#1e7d88', lo: '#063840' }, // Lagon profond
        { hi: '#e8d8b0', base: '#b8a878', lo: '#786840' }, // Sable doré
        { hi: '#5dd5d8', base: '#2ba0a8', lo: '#0e5560' },
        { hi: '#f0ebd8', base: '#c5bfa8', lo: '#85806f' },
        { hi: '#1e7d88', base: '#0e4550', lo: '#02232a' }, // Bleu profond
        { hi: '#e8d8b0', base: '#b8a878', lo: '#786840' },
      ],
    },
  },
  {
    slug: 'roulette-bouillabaisse',
    category: 'roulette',
    name: 'Bouillabaisse',
    description: 'Safran, paprika, rouille — les couleurs qui mettent l\'eau à la bouche.',
    priceCents: 299,
    asset: {
      metals: [
        { hi: '#f8a830', base: '#d47818', lo: '#8a4808' }, // Safran
        { hi: '#e85020', base: '#a83008', lo: '#601802' }, // Paprika
        { hi: '#d8b048', base: '#a07820', lo: '#604008' }, // Curcuma
        { hi: '#c83020', base: '#881808', lo: '#480802' }, // Rouille
        { hi: '#f8a830', base: '#d47818', lo: '#8a4808' },
        { hi: '#e85020', base: '#a83008', lo: '#601802' },
        { hi: '#f0c060', base: '#b88830', lo: '#684810' }, // Doré épicé
        { hi: '#a82010', base: '#681008', lo: '#380802' }, // Rouge profond
      ],
    },
  },
];

async function syncStripe(cosmetic) {
  if (!cosmetic.stripeProductId) {
    const product = await stripe.products.create({
      name: cosmetic.name,
      description: cosmetic.description || undefined,
      metadata: { slug: cosmetic.slug, category: cosmetic.category },
    });
    cosmetic.stripeProductId = product.id;
  }
  if (!cosmetic.stripePriceId) {
    const price = await stripe.prices.create({
      product: cosmetic.stripeProductId,
      unit_amount: cosmetic.priceCents,
      currency: 'eur',
    });
    cosmetic.stripePriceId = price.id;
  }
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const def of SKINS) {
    let cosmetic = await Cosmetic.findOne({ slug: def.slug });
    if (cosmetic) {
      console.log(`= ${def.slug} (déjà présent)`);
      continue;
    }
    cosmetic = new Cosmetic(def);
    await syncStripe(cosmetic);
    await cosmetic.save();
    console.log(`+ ${def.slug} créé (${cosmetic.stripePriceId})`);
  }
  await mongoose.disconnect();
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
