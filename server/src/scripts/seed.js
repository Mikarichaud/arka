require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Pack = require('../models/Pack');
const Challenge = require('../models/Challenge');
const connectDB = require('../config/db');

const PACKS_DATA = [
  {
    name: 'Soirée entre amis',
    description: 'Les classiques pour une bonne soirée',
    theme: 'amis',
    challenges: [
      { text: 'Imite la voix de quelqu\'un dans le groupe pendant 1 minute', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Dis un secret que tu n\'as jamais dit à personne ici', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Appelle quelqu\'un au hasard dans tes contacts et dis-lui que tu l\'aimes', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
      { text: 'Fais rire quelqu\'un du groupe en 30 secondes sans le toucher', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Poste une photo bizarre sur ton réseau social et laisse-la 5 minutes', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Bois cul-sec si quelqu\'un te pose une question et que tu réponds autre chose que oui ou non', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Danse seul pendant 30 secondes sans musique', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Envoie un message vocal incompréhensible à ton meilleur ami', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
    ],
  },
  {
    name: 'Défis sportifs',
    description: 'Pour les athlètes et les faux sportifs',
    theme: 'sportif',
    challenges: [
      { text: 'Fais 20 pompes maintenant', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Jongle avec n\'importe quel objet rond pendant 10 secondes', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Tiens en équilibre sur un pied les yeux fermés pendant 1 minute', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Fais le tour de la pièce en marchant à reculons sans rien toucher', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: '50 squats, pas de négociation possible', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
      { text: 'Imite un sportif professionnel célèbre, les autres doivent deviner', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Planche (gainage) pendant 1 minute 30', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
      { text: 'Lance un objet en l\'air et rattrape-le dans le dos', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
    ],
  },
  {
    name: 'Couple',
    description: 'Pour pimenter la soirée à deux ou en groupe',
    theme: 'couple',
    challenges: [
      { text: 'Dis 3 choses que tu adores chez la personne à ta gauche', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Imite ton/ta partenaire, il/elle doit se reconnaître', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Décris votre première rencontre en mode dramatique comme dans un film', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Raconte le plus gros mensonge que tu as dit dans cette relation', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
      { text: 'Sans parler, communique quelque chose à quelqu\'un du groupe', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Dis ce qui t\'énerve le plus chez la personne en face de toi (doucement !)', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
      { text: 'Rejoue la scène d\'une dispute en mode comédie musicale', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Fais un discours de mariage pour la personne à ta droite', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
    ],
  },
  {
    name: 'Enfants',
    description: 'Des défis fun pour les petits',
    theme: 'enfants',
    challenges: [
      { text: 'Imite ton animal préféré pendant 30 secondes', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Chante une chanson avec la bouche fermée, les autres doivent deviner', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Fais le plus beau dessin possible d\'une maison en 60 secondes', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Marche comme un robot jusqu\'à l\'autre bout de la pièce et reviens', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Dis l\'alphabet à l\'envers le plus vite possible', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Fais semblant d\'être en apesanteur pendant 1 minute', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Invente une nouvelle danse et apprends-la au groupe', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Mange un gâteau sans utiliser tes mains', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
    ],
  },
  {
    name: 'Pack Mireille',
    description: 'Les défis de daronne marseillaise',
    theme: 'marseillais',
    challenges: [
      { text: 'Raconte une embrouille de 10 min pour un truc qui a duré 2 secondes', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Imite ta mère qui appelle quelqu\'un qui est à 3 mètres de toi', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Explique ce que tu as mangé hier soir comme si c\'était un plat gastronomique 3 étoiles', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Donne ton avis sur la météo d\'aujourd\'hui pendant 2 minutes minimum', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Fais semblant d\'appeler le voisin du dessus pour lui dire de faire moins de bruit', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Raconte comment tu as failli rater le bus comme si c\'était un film d\'action', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Explique à quelqu\'un comment aller aux toilettes chez toi', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Imite quelqu\'un qui attend le bus depuis 45 minutes sous le soleil', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
    ],
  },
  {
    name: 'Virage Sud',
    description: 'Les défis de supporters de l\'OM',
    theme: 'marseillais',
    challenges: [
      { text: 'Chante l\'hymne de l\'OM sans perdre la voix, sinon tu payes ta tournée', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Décris le plus beau but que t\'as vu de ta vie (réel ou imaginaire)', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Explique pourquoi l\'arbitre du dernier match était corrompu', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Imite un commentateur sportif sur une action banale (quelqu\'un qui se lève)', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Fais le discours de vestiaire du coach avant un match décisif', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Célèbre un but imaginaire comme si t\'étais au stade avec les fumigènes', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
      { text: 'Explique la tactique que tu aurais utilisée si t\'avais été coach ce soir', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Imite un joueur qui se roule par terre après un tacle absolument bénin', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
    ],
  },
  {
    name: 'Mouloud le Pêcheur',
    description: 'Les défis d\'exagération marseillaise',
    theme: 'marseillais',
    challenges: [
      { text: 'Décris la taille de la sardine qui a bouché le port, les mains écartées à plus de 2 mètres', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Raconte le poisson que t\'as pêché (il doit grossir à chaque phrase)', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Décris la chaleur qu\'il faisait l\'été dernier comme si c\'était le soleil de Mercure', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Explique combien de temps t\'as attendu au restaurant (ça doit durer au moins 3 jours)', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Décris l\'embouteillage sur la Corniche comme si c\'était l\'apocalypse totale', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
      { text: 'Raconte à quel point tu dormais peu quand t\'étais jeune (genre 20 minutes par nuit)', intensity: { level: 1, label: 'Facile', color: '#2DC653' } },
      { text: 'Explique combien tu marchais loin pour aller à l\'école (sans voiture évidemment)', intensity: { level: 2, label: 'Moyen', color: '#C9A84C' } },
      { text: 'Décris ton record sportif personnel (ça doit battre Usain Bolt et Michael Phelps ensemble)', intensity: { level: 3, label: 'Hard', color: '#E63946' } },
    ],
  },
];

async function seed() {
  await connectDB();

  console.log('Suppression des anciens packs officiels...');
  const officialPacks = await Pack.find({ isOfficial: true });
  const officialPackIds = officialPacks.map((p) => p._id);
  await Challenge.deleteMany({ pack: { $in: officialPackIds } });
  await Pack.deleteMany({ isOfficial: true });

  console.log('Création des packs...');
  for (const packData of PACKS_DATA) {
    const pack = await Pack.create({
      name: packData.name,
      description: packData.description,
      theme: packData.theme,
      isOfficial: true,
      isPublic: true,
    });

    const challenges = await Challenge.insertMany(
      packData.challenges.map((c) => ({ ...c, pack: pack._id }))
    );

    pack.challenges = challenges.map((c) => c._id);
    await pack.save();

    console.log(`✅ Pack "${pack.name}" créé avec ${challenges.length} défis`);
  }

  console.log('\nTé ! Seed terminé, on est prêts !');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erreur seed :', err);
  process.exit(1);
});
