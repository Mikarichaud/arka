# Cosmétiques — Roadmap & idées

Document de travail. Liste des cosmétiques achetables envisagés pour La Roulade Marseillaise, organisée par "vecteur" (type d'objet), avec prio dev, idées de pricing et notes techniques.

---

## Archi déjà en place

- `User.purchasedSkins: [String]` — array d'identifiants de skins achetés (déjà dans le model)
- `User.tier: 'free' | 'premium'` + `purchasedPacks` — pattern abonnement + achat unique
- Stripe Checkout + webhooks fonctionnels
- Cloudinary pour les images

Conclusion : la base est prête, il "suffit" d'ajouter un modèle `Skin`/`Cosmetic` (catégorie, prix, asset) + un magasin et le branchement Stripe pour les achats unitaires.

---

## 1. Skins de roulette ⭐ priorité haute

**Pourquoi en premier** : la roulette est vue 100% du temps pendant une partie → valeur perçue maximale. Techniquement elle est déjà 100% SVG paramétrable (`METALS` array dans `client/src/components/Roulette/Roulette.jsx`) → un skin = juste une nouvelle palette + éventuels patterns SVG, pas de refonte.

**Idées de packs**

- **"Planches du port"** — bois patiné, cordages en séparateurs, ambiance vieux port
- **"Vélodrome"** — tranches blanc / bleu OM, étoile centrale dorée, hymne discret au spin
- **"Calanques"** — turquoise + blanc calcaire, slices façon strates de roche
- **"Bouillabaisse"** — safran/orangé/rouge, vapeur qui s'échappe au spin
- **"Nuit des Goudes"** — noir étoilé, cochonnet doré qui glow
- **"Boule de pétanque cassée"** — look ultra réaliste, terre battue
- **"Confiserie"** — tranches couleurs navettes/calissons (gourmand)
- **"Fada de luxe"** — version full glitter rainbow exagéré

**Pricing suggéré** : 2,99 € à 3,99 € unitaire. Bundle "Saison OM" (Vélodrome + cochonnet doré + confettis OM) à 7,99 €.

---

## 2. Aiguilles / cochonnets

Petit ticket, mécanique de "collection".

- Aiguille : chrome (default), bois sculpté, marbre, ivoire, rubis
- Cochonnet : or massif (default), argent, sertis de pierres
- Set "Fada" : aiguille en santon, cochonnet en savon de Marseille

**Pricing** : 0,99 € à 1,99 € unitaire. Bien pour les achats impulsifs.

---

## 3. Cadres d'avatar + badges

Cible l'engagement social et l'identité.

**Cadres autour de la photo de profil**
- Lauriers dorés, étoiles OM, drapeau de Marseille, mer/vagues animées

**Badges sous le pseudo**
- "Capitaine du Port", "Fada certifié", "Vétéran du Vélodrome", "Mama mia"
- Possibilité : badges débloqués par accomplissements (X parties, Y défis réussis) plutôt qu'achetés

**Pricing** : 0,99 € unitaire ou pack "Identité" à 2,99 € (3 cadres + 5 badges).

---

## 4. Animations EndGame / confettis

À éviter pour le V1 — vu uniquement en fin de partie, donc faible exposition vs effort de dev.

- Pluie de sardines, lancer de calissons, feux d'artifice du 14 juillet sur la mer, pétales de mimosa
- Cadres de podium custom : antique (laurier), pétanque (boules en hauteur), maritime (mât + drapeau)

**Pricing** : 1,99 € à 2,99 €.

---

## 5. Sons / voix-off ⭐ priorité haute après skins roulette

Très différenciant, peu coûteux côté code (juste un swap dans `useSound.js`).

- **Pack "Narrateur marseillais"** : voix-off d'un comédien à l'accent qui annonce le défi, le résultat, le tour. Style commentateur OM.
- **Effets sonores premium** : vrai son de carreau enregistré, sirène de stade, klaxon de ferry, cri de mouette
- **Voix "Rien ne va plus"** custom (au lancement de la roulette)

**Note pratique** : nécessite enregistrement studio ou stock audio royalty-free. C'est le seul vecteur qui demande un asset externe.

**Pricing** : 4,99 € pour le pack narrateur (ressources externes), 1,99 € pour les effets sonores.

---

## 6. Backgrounds globaux de l'app

Alternative au Dark Mode "Nuit sur les Goudes".

- **"Mistral"** — bleu froid + texture mouvement
- **"Carnaval"** — couleurs vives + emojis flottants en arrière-plan
- **"Pastis Hour"** — ambre/jaune chaud, soleil couchant

**Pricing** : 2,99 € unitaire.

---

## Modèle de monétisation possible

| Type | Prix unitaire | Bundle | Notes |
|---|---|---|---|
| Skin roulette | 2,99 € – 3,99 € | "Saison OM" 7,99 € | Plus gros ticket |
| Aiguille / cochonnet | 0,99 € – 1,99 € | – | Achat impulsif |
| Cadre avatar / badge | 0,99 € | "Identité" 2,99 € | – |
| Animations EndGame | 1,99 € – 2,99 € | – | Vu en fin de partie uniquement |
| Pack sons | 1,99 € – 4,99 € | – | Coût externe (enregistrement) |
| Background app | 2,99 € | – | – |

**Idée Pass** : "Pass saison" mensuel à 4,99 €/mois qui débloque toutes les nouveautés cosmétiques de la saison (3 mois). Différent du Premium (qui donne l'accès aux packs).

---

## Recommandation de priorité dev

1. **Skins de roulette** (3-4 designs) — ratio valeur/effort le plus élevé.
2. **Sons / voix-off** — différenciant, peu de code.
3. **Cadres avatar + badges** — quick win social/identité.
4. **Aiguilles / cochonnets** — collection complémentaire.
5. **Backgrounds globaux** — nice-to-have.
6. **Animations EndGame** — à reporter, faible exposition.

---

## Architecture technique à prévoir

### Modèle `Cosmetic` (server)

```js
{
  slug: String (unique),         // 'roulette-velodrome'
  category: 'roulette' | 'needle' | 'cochonnet' | 'avatar-frame' | 'badge' | 'background' | 'sound-pack' | 'endgame-anim',
  name: String,
  description: String,
  priceCents: Number,            // 299 = 2,99 €
  stripePriceId: String,         // ref Stripe
  asset: Object,                 // données spécifiques selon catégorie (palette, URL audio, etc.)
  isActive: Boolean,             // visible dans le shop
  publishAt: Date,               // programmation
  createdAt, updatedAt
}
```

### Routes côté serveur

- `GET /api/cosmetics` — liste publique du shop (avec flag `owned: bool` si user connecté)
- `POST /api/cosmetics/:id/checkout` — Stripe Checkout pour achat unitaire
- Webhook : événement `payment_intent.succeeded` → ajout dans `user.purchasedSkins`
- `/api/gate/cosmetics` — CRUD admin (réutilise `requireGate`)

### Application côté client

- Page `/shop` (boutique) — grille des cosmétiques par catégorie
- Page `/profile` — section "Mes cosmétiques" + sélecteur "actif" par catégorie
- Stockage : `User.activeSkins: { roulette: 'velodrome', needle: 'chrome', ... }` (un actif par catégorie) en plus de `purchasedSkins`
- `Roulette.jsx` lit `user.activeSkins.roulette` pour appliquer le bon `METALS`
- Idem pour aiguille, cochonnet, sons, etc.

### Gating gaté

L'admin gaté crée et gère les cosmétiques depuis `/gate/cosmetics` (à créer), avec les mêmes mécaniques que les packs : `isActive`, `publishAt`, catégorie.

---

## Notes & idées en vrac

- Possibilité de cosmétiques **gratuits** débloqués par accomplissements (vs achetés) — bon pour la rétention.
- Considérer un système de **"pétards"** (monnaie virtuelle gagnée en jouant) qu'on peut convertir en cosmétiques mineurs. Évite que tout soit payant.
- Les skins doivent rester accessibles **après expiration de l'abonnement** (cf. logique déjà en place pour `purchasedPacks`).
- Pour les voix-off, prévoir une **version "démo"** de 5s avant achat (sinon achat à l'aveugle = mauvaise UX).
