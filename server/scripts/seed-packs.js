// Seed les packs officiels initiaux.
// Mireille + Virage Sud = Free (vitrine d'usage, pour valoriser les Premium)
// Mouloud le Pêcheur = Premium (démontre le paywall + teaser)
// Idempotent : ne crée pas un pack qui existe déjà (par nom).

require('dotenv').config();
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const Pack = require('../src/models/Pack');
const Challenge = require('../src/models/Challenge');

const FACILE = { level: 1, label: 'Facile', color: '#2DC653' };
const MOYEN = { level: 2, label: 'Moyen', color: '#C9A84C' };
const HARD = { level: 3, label: 'Hard', color: '#E63946' };

const PACKS = [
  {
    name: 'Pack Mireille',
    description: 'Les défis de daronne marseillaise, pour les minots et les vieux',
    theme: 'marseillais',
    isPremium: false,
    challenges: [
      { text: "Raconte une embrouille de 10 min pour un truc qui a duré 2 secondes", intensity: FACILE },
      { text: "Imite ta mère qui appelle quelqu'un qui est à 3 mètres de toi", intensity: FACILE },
      { text: "Explique ce que tu as mangé hier soir comme si c'était un plat gastronomique 3 étoiles", intensity: MOYEN },
      { text: "Donne ton avis sur la météo d'aujourd'hui pendant 2 minutes minimum", intensity: FACILE },
      { text: "Fais semblant d'appeler le voisin du dessus pour lui dire de faire moins de bruit", intensity: MOYEN },
      { text: "Raconte comment tu as failli rater le bus comme si c'était un film d'action", intensity: MOYEN },
      { text: "Explique à quelqu'un comment aller aux toilettes chez toi", intensity: FACILE },
      { text: "Imite quelqu'un qui attend le bus depuis 45 minutes", intensity: MOYEN },
    ],
  },
  {
    name: 'Pack Virage Sud',
    description: 'Les défis de supporters de l\'OM, pour les fadas du Vélodrome',
    theme: 'sportif',
    isPremium: false,
    challenges: [
      { text: "Chante l'hymne de l'OM sans perdre la voix, sinon tu payes ta tournée", intensity: MOYEN },
      { text: "Décris le plus beau but que t'as vu de ta vie (réel ou imaginaire)", intensity: FACILE },
      { text: "Explique pourquoi l'arbitre du dernier match était corrompu", intensity: MOYEN },
      { text: "Imite un commentateur sportif sur une action banale (quelqu'un qui se lève)", intensity: MOYEN },
      { text: "Fais le discours de vestiaire du coach avant un match décisif", intensity: HARD },
      { text: "Célèbre un but imaginaire comme si t'étais au stade", intensity: FACILE },
      { text: "Explique la tactique que tu aurais utilisée si t'avais été coach", intensity: MOYEN },
      { text: "Imite un joueur qui se roule par terre après un tacle bénin", intensity: FACILE },
    ],
  },
  {
    name: 'Pack Mouloud le Pêcheur',
    description: 'Les défis d\'exagération marseillaise, pour les amateurs de gros poissons',
    theme: 'marseillais',
    isPremium: true,
    challenges: [
      { text: "Décris la taille de la sardine qui a bouché le port, les mains écartées à plus de 2 mètres", intensity: FACILE },
      { text: "Raconte le poisson que t'as pêché (il grossit à chaque phrase)", intensity: MOYEN },
      { text: "Décris la chaleur qu'il faisait l'été dernier comme si c'était le soleil de Mercure", intensity: MOYEN },
      { text: "Explique combien de temps t'as attendu au restaurant (ça doit durer au moins 3 jours)", intensity: HARD },
      { text: "Décris l'embouteillage sur la Corniche comme si c'était l'apocalypse", intensity: MOYEN },
      { text: "Raconte à quel point tu dormais peu quand t'étais jeune", intensity: FACILE },
      { text: "Explique combien tu marchais loin pour aller à l'école (sans voiture évidemment)", intensity: MOYEN },
      { text: "Décris ton record sportif personnel (ça doit battre Usain Bolt)", intensity: HARD },
    ],
  },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const def of PACKS) {
    const exists = await Pack.findOne({ name: def.name, isOfficial: true });
    if (exists) {
      console.log(`= ${def.name} (déjà présent)`);
      continue;
    }
    const pack = await Pack.create({
      name: def.name,
      description: def.description,
      theme: def.theme,
      isOfficial: true,
      isPremium: def.isPremium,
      isPublic: true,
      isActive: true,
      shareCode: nanoid(8).toUpperCase(),
    });
    const challenges = await Challenge.insertMany(
      def.challenges.map((c) => ({ ...c, pack: pack._id }))
    );
    pack.challenges = challenges.map((c) => c._id);
    await pack.save();
    console.log(`+ ${def.name} créé (${def.isPremium ? 'Premium' : 'Free'}, ${challenges.length} défis)`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
