require('dotenv').config();
const mongoose = require('mongoose');
const QuizQuestion = require('../src/models/QuizQuestion');

// Banque du Permis Marseillais — v1 (à valider/affiner via /gate/quiz).
// Source lisible : PERMIS_MARSEILLAIS_QUIZ.md à la racine du repo.
// q(category, scope, difficulty, text, options[4], correctIndex)
const q = (category, scope, difficulty, text, options, correctIndex) =>
  ({ category, scope, difficulty, text, options, correctIndex });

const QUESTIONS = [
  // ===================== 🗣️ LE PARLER =====================
  q('parler', 'trial', 'facile', 'Que veut dire « dégun » ?', ['Un imbécile', 'Personne', 'Un ami', 'Beaucoup de monde'], 1),
  q('parler', 'trial', 'facile', 'Un « minot », c\'est :', ['Un enfant', 'Un vieux', 'Un touriste', 'Un poisson'], 0),
  q('parler', 'trial', 'moyen', '« Ça pègue », ça veut dire que ça :', ['Brûle', 'Colle', 'Pue', 'Glisse'], 1),
  q('parler', 'trial', 'moyen', 'Un « fada », c\'est quelqu\'un de :', ['Radin', 'Élégant', 'Fou, un peu cinglé', 'Paresseux'], 2),
  q('parler', 'exam', 'facile', 'Une « cagole », c\'est :', ['Une grand-mère', 'Une fille vulgaire et tape-à-l\'œil', 'Une serveuse', 'Une danseuse'], 1),
  q('parler', 'exam', 'facile', '« Tarpin bien », ça signifie :', ['Plutôt bien', 'Vachement bien', 'Pas terrible', 'Bientôt bien'], 1),
  q('parler', 'exam', 'facile', '« Peuchère ! » exprime :', ['La colère', 'La compassion (le/la pauvre)', 'La joie', 'Le dégoût'], 1),
  q('parler', 'exam', 'moyen', '« Tu m\'escagasses » veut dire :', ['Tu me fais rire', 'Tu m\'agaces, tu me fatigues', 'Tu me mens', 'Tu me suis'], 1),
  q('parler', 'exam', 'moyen', 'Un « cacou », c\'est :', ['Un gâteau', 'Un frimeur, un m\'as-tu-vu', 'Un pêcheur', 'Un policier'], 1),
  q('parler', 'exam', 'moyen', '« Rouméguer », ça veut dire :', ['Courir', 'Râler, ronchonner', 'Manger vite', 'Dormir'], 1),
  q('parler', 'exam', 'moyen', 'Quand on dit « boulègue ! », on demande de :', ['Se taire', 'Remuer, se bouger', 'Payer', 'Partir'], 1),
  q('parler', 'exam', 'moyen', '« Oh fan ! » est avant tout :', ['Un au revoir', 'Une exclamation de surprise', 'Une insulte', 'Une commande au bar'], 1),
  q('parler', 'exam', 'difficile', '« Esquiché », ça veut dire :', ['Fatigué', 'Serré, à l\'étroit', 'Trempé', 'En colère'], 1),
  q('parler', 'exam', 'difficile', '« Emboucaner » quelqu\'un, c\'est :', ['Le féliciter', 'L\'embêter, l\'enfumer, le tromper', 'Le nourrir', 'Le coiffer'], 1),
  q('parler', 'exam', 'difficile', 'Un « gabian », à Marseille, c\'est :', ['Un taxi', 'Un goéland', 'Un pêcheur', 'Un vent'], 1),
  q('parler', 'exam', 'difficile', '« Le tafanari », c\'est :', ['Le marché', 'Le derrière, les fesses', 'Le grenier', 'Le carnaval'], 1),
  q('parler', 'exam', 'difficile', 'Traiter quelqu\'un de « bordille », c\'est dire que c\'est :', ['Un rigolo', 'Une ordure, un bon à rien', 'Un costaud', 'Un gourmand'], 1),
  q('parler', 'exam', 'difficile', '« Au cagnard », ça veut dire en plein :', ['Vent', 'Soleil, grosse chaleur', 'Hiver', 'Marché'], 1),
  q('parler', 'exam', 'difficile', 'Un « jobastre », c\'est :', ['Un travailleur', 'Un fou, un imbécile', 'Un boulanger', 'Un chanceux'], 1),
  q('parler', 'exam', 'difficile', '« Ça m\'espante », ça veut dire que ça m\' :', ['Ennuie', 'Épate, étonne', 'Énerve', 'Endort'], 1),
  q('parler', 'exam', 'difficile', 'Une « pitchoune », c\'est :', ['Une bêtise', 'Une petite (fille, chérie)', 'Une boisson', 'Une barque'], 1),
  q('parler', 'exam', 'difficile', '« S\'engatser », c\'est :', ['Se baigner', 'S\'énerver, se prendre la tête', 'Se régaler', 'Se perdre'], 1),
  q('parler', 'exam', 'moyen', '« Va te faire cuire un œuf » se dit ici plutôt :', ['« Vai »', '« Vai fan »', '« Boudiou »', '« Qué »'], 1),
  q('parler', 'exam', 'difficile', 'Une « favouille », au sens propre, c\'est :', ['Une vague', 'Un petit crabe', 'Une olive', 'Une ruelle'], 1),

  // ===================== 🍽️ LA BOUFFE =====================
  q('bouffe', 'trial', 'facile', 'La navette marseillaise a la forme d\'une :', ['Étoile', 'Petite barque', 'Couronne', 'Boule'], 1),
  q('bouffe', 'trial', 'facile', 'La panisse est faite à base de :', ['Pomme de terre', 'Farine de pois chiche', 'Maïs', 'Blé'], 1),
  q('bouffe', 'trial', 'moyen', 'La bouillabaisse est un plat de :', ['Viande', 'Poissons', 'Légumes', 'Pâtes'], 1),
  q('bouffe', 'trial', 'moyen', 'L\'aïoli, c\'est une sauce à base d\' :', ['Tomate', 'Ail et huile d\'olive', 'Moutarde', 'Anchois'], 1),
  q('bouffe', 'exam', 'facile', 'Le pastis se boit traditionnellement avec :', ['Du jus d\'orange', 'De l\'eau fraîche', 'Du lait', 'Du vin'], 1),
  q('bouffe', 'exam', 'facile', 'Les « pieds paquets » sont préparés avec des :', ['Pâtes', 'Tripes de mouton', 'Pieds de cochon', 'Légumes farcis'], 1),
  q('bouffe', 'exam', 'facile', 'La tapenade est principalement faite d\' :', ['Aubergines', 'Olives (câpres, anchois)', 'Courgettes', 'Pois chiches'], 1),
  q('bouffe', 'exam', 'moyen', 'Le dosage traditionnel d\'un pastis bien fait, c\'est :', ['1 pour 3', '1 pour 5', '1 pour 7', 'Moitié-moitié'], 1),
  q('bouffe', 'exam', 'moyen', 'Le chichi frégi est une spécialité sucrée de :', ['Du Panier', 'L\'Estaque', 'Cassis', 'La Canebière'], 1),
  q('bouffe', 'exam', 'moyen', 'Dans une vraie bouillabaisse, le poisson indispensable est :', ['Le thon', 'La rascasse', 'Le saumon', 'La sardine'], 1),
  q('bouffe', 'exam', 'moyen', 'La sauce qui accompagne la bouillabaisse s\'appelle la :', ['Tapenade', 'Rouille', 'Anchoïade', 'Brandade'], 1),
  q('bouffe', 'exam', 'moyen', 'La fougasse est une sorte de :', ['Soupe', 'Pain (plat, ajouré)', 'Gâteau glacé', 'Charcuterie'], 1),
  q('bouffe', 'exam', 'difficile', 'Le mot « tapenade » vient du provençal « tapeno », qui désigne :', ['L\'olive', 'La câpre', 'L\'anchois', 'L\'ail'], 1),
  q('bouffe', 'exam', 'difficile', 'Le Four des Navettes, près de Saint-Victor, a été fondé en :', ['1881', '1781', '1920', '1650'], 1),
  q('bouffe', 'exam', 'difficile', 'La navette est traditionnellement parfumée à :', ['L\'anis', 'La fleur d\'oranger', 'Au citron', 'La lavande'], 1),
  q('bouffe', 'exam', 'difficile', 'La poutargue, « caviar » provençal, est faite d\'œufs de :', ['Thon', 'Mulet', 'Oursin', 'Sardine'], 1),
  q('bouffe', 'exam', 'difficile', 'L\'anchoïade se déguste surtout avec :', ['Du pain grillé', 'Des légumes crus (à tremper)', 'Des pâtes', 'Du poisson pané'], 1),
  q('bouffe', 'exam', 'difficile', 'Les « supions » que l\'on mange frits, ce sont de petits :', ['Poulpes, encornets (seiches)', 'Crabes', 'Beignets', 'Poivrons'], 0),
  q('bouffe', 'exam', 'difficile', 'Le « grand aïoli » se sert traditionnellement avec de la :', ['Daurade', 'Morue', 'Rascasse', 'Truite'], 1),
  q('bouffe', 'exam', 'difficile', 'Les oreillettes (ou merveilles) sont des beignets que l\'on mange surtout :', ['À Noël', 'Au Carnaval, Mardi gras', 'À Pâques', 'En été'], 1),
  q('bouffe', 'exam', 'difficile', 'La marque de pastis fondée à Marseille par Paul Ricard date de :', ['1900', '1932', '1951', '1972'], 1),
  q('bouffe', 'exam', 'moyen', 'Le marché aux poissons se tient chaque matin sur le :', ['Cours Julien', 'Quai des Belges (Vieux-Port)', 'Prado', 'Panier'], 1),

  // ===================== 🔵 L'OM =====================
  q('om', 'trial', 'facile', 'En quelle année l\'OM a-t-il gagné la Ligue des Champions ?', ['1991', '1993', '1999', '2004'], 1),
  q('om', 'trial', 'facile', 'Les couleurs de l\'OM sont :', ['Rouge et noir', 'Blanc et bleu ciel', 'Vert et blanc', 'Bleu et rouge'], 1),
  q('om', 'trial', 'moyen', 'La devise de l\'OM, c\'est :', ['« Allez Marseille »', '« Droit au but »', '« Toujours plus haut »', '« Honneur et patrie »'], 1),
  q('om', 'trial', 'moyen', 'Le stade de l\'OM s\'appelle le :', ['Parc des Princes', 'Vélodrome', 'Stade Vélo', 'Stade Bonne Mère'], 1),
  q('om', 'exam', 'facile', 'Le surnom des joueurs de l\'OM, ce sont les :', ['Gones', 'Phocéens, Olympiens', 'Canaris', 'Dogues'], 1),
  q('om', 'exam', 'facile', 'Le match OM–PSG est surnommé :', ['Le Derby', 'Le Classique', 'Le Choc', 'La Guerre'], 1),
  q('om', 'exam', 'facile', 'Le virage emblématique des ultras au sud du stade, c\'est le :', ['Virage Nord', 'Virage Sud', 'Virage Est', 'Kop de Boulogne'], 1),
  q('om', 'exam', 'moyen', 'Jean-Pierre Papin a remporté le Ballon d\'Or en :', ['1989', '1991', '1993', '1995'], 1),
  q('om', 'exam', 'moyen', 'L\'OM a été fondé en :', ['1899', '1919', '1932', '1945'], 0),
  q('om', 'exam', 'moyen', 'Le Vélodrome a été inauguré en :', ['1924', '1937', '1950', '1971'], 1),
  q('om', 'exam', 'moyen', 'Avant Marseille, Didier Drogba évoluait à :', ['Lens', 'Guingamp', 'Auxerre', 'Le Havre'], 1),
  q('om', 'exam', 'difficile', 'Qui a marqué l\'unique but de la finale 1993 contre le Milan AC ?', ['Abedi Pelé', 'Basile Boli', 'Jean-Pierre Papin', 'Rudi Völler'], 1),
  q('om', 'exam', 'difficile', 'Le capitaine de l\'OM lors du sacre 1993 était :', ['Basile Boli', 'Didier Deschamps', 'Jean-Pierre Papin', 'Marcel Desailly'], 1),
  q('om', 'exam', 'difficile', 'La finale 1993 s\'est jouée dans quelle ville ?', ['Paris', 'Munich', 'Rome', 'Marseille'], 1),
  q('om', 'exam', 'difficile', 'Meilleur buteur du championnat 1971, ce Yougoslave s\'appelait :', ['Gunnar Andersson', 'Josip Skoblar', 'Roger Magnusson', 'Joseph Bonnel'], 1),
  q('om', 'exam', 'difficile', 'L\'homme d\'affaires qui a racheté l\'OM en 1986 est :', ['Robert Louis-Dreyfus', 'Bernard Tapie', 'Pape Diouf', 'Vincent Labrune'], 1),
  q('om', 'exam', 'difficile', 'L\'ailier anglais surnommé « Magic Chris » dans les années 90, c\'était :', ['Chris Waddle', 'Tony Cascarino', 'Trevor Steven', 'Gary Lineker'], 0),
  q('om', 'exam', 'difficile', 'L\'OM a remporté son dernier titre de champion de France en :', ['2004', '2010', '2013', '2018'], 1),
  q('om', 'exam', 'difficile', 'Le sélectionneur champion du monde 2018, ancien capitaine de l\'OM, c\'est :', ['Marcel Desailly', 'Didier Deschamps', 'Laurent Blanc', 'Fabien Barthez'], 1),
  q('om', 'exam', 'difficile', '« Aux Armes » est le chant repris au Vélodrome sur l\'air de :', ['La Marseillaise', '« Les Lacs du Connemara » (Sardou)', 'Bella Ciao', 'We Will Rock You'], 1),
  q('om', 'exam', 'moyen', 'Le gardien marseillais champion du monde 1998, c\'était :', ['Steve Mandanda', 'Fabien Barthez', 'Gégé Gélamur', 'Andreas Köpke'], 1),

  // ===================== 🗺️ LA GÉO =====================
  q('geo', 'trial', 'facile', 'Combien Marseille compte-t-elle d\'arrondissements ?', ['9', '12', '16', '20'], 2),
  q('geo', 'trial', 'facile', 'La grande avenue mythique de Marseille, c\'est la :', ['Croisette', 'Canebière', 'Promenade des Anglais', 'Rambla'], 1),
  q('geo', 'trial', 'moyen', 'Les calanques s\'étendent entre Marseille et :', ['Toulon', 'Cassis', 'Aix', 'Martigues'], 1),
  q('geo', 'trial', 'moyen', 'Le plus vieux quartier de Marseille s\'appelle :', ['Noailles', 'Le Panier', 'L\'Estaque', 'Le Prado'], 1),
  q('geo', 'exam', 'facile', 'Le château rendu célèbre par Alexandre Dumas se trouve sur l\'île :', ['De Ratonneau', 'D\'If', 'De Pomègues', 'Du Frioul (Tiboulen)'], 1),
  q('geo', 'exam', 'facile', 'Le grand musée inauguré en 2013 au bord de l\'eau, c\'est le :', ['Mucem', 'Louvre', 'Centre Pompidou', 'Palais Longchamp'], 0),
  q('geo', 'exam', 'facile', 'Le petit port pittoresque encaissé sous la Corniche, c\'est le Vallon des :', ['Goudes', 'Auffes', 'Catalans', 'Phocéens'], 1),
  q('geo', 'exam', 'moyen', 'Marseille a été fondée vers 600 av. J.-C. par les Grecs venus de :', ['Athènes', 'Phocée', 'Sparte', 'Corinthe'], 1),
  q('geo', 'exam', 'moyen', 'Son nom grec antique était :', ['Lutèce', 'Massalia', 'Nicaea', 'Arelate'], 1),
  q('geo', 'exam', 'moyen', 'Le quartier des peintres (Cézanne, Braque) au nord, c\'est :', ['Le Panier', 'L\'Estaque', 'Les Goudes', 'Endoume'], 1),
  q('geo', 'exam', 'moyen', 'Au bout de la route, « le bout du monde » marseillais, c\'est le village des :', ['Catalans', 'Goudes', 'Camoins', 'Aygalades'], 1),
  q('geo', 'exam', 'difficile', 'Le point culminant du massif des Calanques est le mont :', ['Marseilleveyre', 'Puget', 'Carpiagne', 'Garlaban'], 1),
  q('geo', 'exam', 'difficile', 'La calanque d\'En-Vau se situe sur la commune de :', ['Marseille', 'Cassis', 'La Ciotat', 'Carry-le-Rouet'], 1),
  q('geo', 'exam', 'difficile', 'Le Vélodrome se situe dans quel arrondissement ?', ['1er', '8e', '6e', '13e'], 1),
  q('geo', 'exam', 'difficile', 'La « Cité Radieuse », sur le bd Michelet, a été conçue par :', ['Gustave Eiffel', 'Le Corbusier', 'Rudy Ricciotti', 'Auguste Perret'], 1),
  q('geo', 'exam', 'difficile', 'L\'archipel au large du Vieux-Port s\'appelle le :', ['Frioul', 'Lérins', 'Embiez', 'Riou'], 0),
  q('geo', 'exam', 'difficile', 'Le quartier-marché surnommé « le ventre de Marseille », c\'est :', ['Le Panier', 'Noailles', 'La Plaine', 'La Joliette'], 1),
  q('geo', 'exam', 'difficile', 'La basilique Notre-Dame de la Garde domine la ville du haut d\'une colline d\'environ :', ['50 m', '150 m', '300 m', '500 m'], 1),
  q('geo', 'exam', 'difficile', 'Le fleuve côtier qui traverse l\'est marseillais, c\'est :', ['La Durance', 'L\'Huveaune', 'Le Gapeau', 'L\'Arc'], 1),
  q('geo', 'exam', 'moyen', 'L\'aéroport Marseille-Provence se trouve à :', ['Aubagne', 'Marignane', 'Vitrolles', 'Istres'], 1),
  q('geo', 'exam', 'difficile', 'La plage située juste sous le Pharo, c\'est la plage des :', ['Prophètes', 'Catalans', 'Phocéens', 'Corbières'], 1),

  // ===================== 🎭 CULTURE & TRADITIONS =====================
  q('culture', 'trial', 'facile', '« La Bonne Mère », c\'est le surnom de :', ['La Major', 'Notre-Dame de la Garde', 'Saint-Victor', 'Le Mucem'], 1),
  q('culture', 'trial', 'facile', 'Le vent froid et sec qui balaie Marseille, c\'est le :', ['Sirocco', 'Mistral', 'Levant', 'Marin'], 1),
  q('culture', 'trial', 'moyen', 'Les petites figurines de la crèche provençale s\'appellent les :', ['Cigales', 'Santons', 'Ravis', 'Pitchouns'], 1),
  q('culture', 'trial', 'moyen', 'L\'insecte symbole de la Provence (porte-bonheur), c\'est la :', ['Coccinelle', 'Cigale', 'Abeille', 'Sauterelle'], 1),
  q('culture', 'exam', 'facile', 'À Noël, la tradition provençale veut qu\'on serve combien de desserts ?', ['7', '13', '9', '12'], 1),
  q('culture', 'exam', 'facile', 'Le footballeur né à La Castellane (Marseille) en 1972, c\'est :', ['Thierry Henry', 'Zinedine Zidane', 'Eric Cantona', 'Samir Nasri'], 1),
  q('culture', 'exam', 'facile', 'Le groupe de rap marseillais légendaire, c\'est :', ['NTM', 'IAM', 'Sniper', 'Lunatic'], 1),
  q('culture', 'exam', 'moyen', 'La trilogie « Marius, Fanny, César » a été écrite par :', ['Jean Giono', 'Marcel Pagnol', 'Émile Zola', 'Alphonse Daudet'], 1),
  q('culture', 'exam', 'moyen', 'La pétanque telle qu\'on la connaît est née à :', ['Marseille', 'La Ciotat', 'Aix', 'Aubagne'], 1),
  q('culture', 'exam', 'moyen', 'Le savon de Marseille véritable contient au moins :', ['50 % d\'huile', '72 % d\'huile', '90 % d\'huile', '30 % d\'huile'], 1),
  q('culture', 'exam', 'difficile', 'Le mot provençal « santoun » signifie littéralement :', ['Petit Noël', 'Petit saint', 'Figurine', 'Petit santal'], 1),
  q('culture', 'exam', 'difficile', 'La pétanque fut inventée en 1910 par un joueur perclus de rhumatismes nommé :', ['Frédéric Mistral', 'Jules Lenoir', 'Marcel Pagnol', 'Paul Ricard'], 1),
  q('culture', 'exam', 'difficile', 'Le mot « pétanque » vient de l\'expression provençale « pèd tanca », c\'est-à-dire :', ['Boule lancée', 'Pieds joints, plantés', 'Terrain plat', 'Coup gagnant'], 1),
  q('culture', 'exam', 'difficile', 'La fabrication du savon de Marseille fut réglementée par un édit de Colbert en :', ['1588', '1688', '1788', '1888'], 1),
  q('culture', 'exam', 'difficile', 'Le poète provençal prix Nobel de littérature 1904, fondateur du Félibrige, c\'est :', ['Frédéric Mistral', 'Marcel Pagnol', 'Alphonse Daudet', 'Jean Aicard'], 0),
  q('culture', 'exam', 'difficile', 'L\'écrivain de « Cyrano de Bergerac », né à Marseille en 1868, c\'est :', ['Edmond Rostand', 'Victor Hugo', 'Émile Zola', 'Marcel Pagnol'], 0),
  q('culture', 'exam', 'difficile', 'Le sculpteur marseillais des « Compressions » et du « Pouce » s\'appelait :', ['César', 'Arman', 'Niki de Saint Phalle', 'Rodin'], 0),
  q('culture', 'exam', 'difficile', 'La légende de « la sardine qui a bouché le port » viendrait du navire nommé :', ['La Sardine', 'La Sartine', 'Le Phocéen', 'La Massalia'], 1),
  q('culture', 'exam', 'difficile', 'L\'album culte d\'IAM sorti en 1997, c\'est :', ['« Ombre est lumière »', '« L\'École du micro d\'argent »', '« Revoir un printemps »', '« Saison 5 »'], 1),
  q('culture', 'exam', 'difficile', 'Marcel Pagnol est né à :', ['Marseille', 'Aubagne', 'La Treille', 'Cassis'], 1),
];

// Mélange les 4 options (Fisher–Yates) et recale correctIndex → la bonne réponse
// n'est plus systématiquement en B, même au repos en base. En jeu, un second mélange
// est appliqué au moment de servir chaque essai (cf. routes/permis.js).
function shuffleOptions(q) {
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => q.options[i]), correctIndex: order.indexOf(q.correctIndex) };
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await QuizQuestion.deleteMany({});
  const docs = QUESTIONS.map(shuffleOptions);
  await QuizQuestion.insertMany(docs);

  const posDist = docs.reduce((acc, x) => { acc[x.correctIndex] = (acc[x.correctIndex] || 0) + 1; return acc; }, {});
  console.log('  position bonne réponse en base:', posDist);
  const byScope = QUESTIONS.reduce((acc, x) => { acc[x.scope] = (acc[x.scope] || 0) + 1; return acc; }, {});
  const examByDiff = QUESTIONS.filter((x) => x.scope === 'exam').reduce((acc, x) => { acc[x.difficulty] = (acc[x.difficulty] || 0) + 1; return acc; }, {});
  console.log(`+ ${QUESTIONS.length} questions seedées.`);
  console.log(`  scope:`, byScope);
  console.log(`  examen par difficulté:`, examByDiff);
  await mongoose.disconnect();
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
