# La Roulade Marseillaise by ARKA — CLAUDE.md

## Vision du projet

Application web mobile-first de jeu de défis en tour par tour. Une roulette fictive 8 cases s'anime et s'arrête sur un défi que le joueur doit réaliser. Ambiance 100% marseillaise : design, sons, textes, humour.

Jeu **physique** (les joueurs sont dans la même pièce), **pas de multijoueur temps réel**. Chaque joueur joue à son tour sur le même écran.

---

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | React 18 + Vite 8, React Router v6, Zustand, Framer Motion |
| Backend | Node.js 22.12 + Express 5 |
| Base de données | MongoDB 9 + Mongoose |
| Auth | JWT + bcryptjs |
| Médias | Cloudinary (stream direct) + Multer (memoryStorage) |
| Paiements | Stripe (Checkout + Billing Portal + Webhooks) |
| QR Code | qrcode.react |
| PWA | vite-plugin-pwa (Phase 6) |
| Déploiement | Docker Compose + Nginx + Certbot sur OVH |

---

## Structure du repo (monorepo)

```
la-roulade-marseillaise/
├── client/                   # React + Vite
│   ├── public/
│   │   ├── sounds/           # Fichiers audio (vide — à remplir Phase 6)
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChallengeCard/
│   │   │   ├── EndGame/          # Écran fin de partie + confettis
│   │   │   ├── HomeRoulette/     # Roulette d'accueil cliquable
│   │   │   ├── Layout/
│   │   │   ├── MediaUpload/      # Upload photo/vidéo Cloudinary
│   │   │   ├── PastisTimer/
│   │   │   ├── PaywallModal/     # Modale teaser pack premium
│   │   │   ├── PlayerCard/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Roulette/
│   │   │   └── VotePanel/
│   │   ├── pages/
│   │   │   ├── Auth/             # Login + Register (pseudo ou email)
│   │   │   ├── Editor/           # Éditeur de packs perso (protégé)
│   │   │   ├── Gallery/          # /gallery/:shareLink — public
│   │   │   ├── Game/             # Écran de jeu principal
│   │   │   ├── History/          # /history — protégé
│   │   │   ├── Home/
│   │   │   ├── Packs/            # PackSelection + PackLibrary
│   │   │   ├── Premium/          # Premium (pricing) + PremiumSuccess
│   │   │   ├── Profile/          # /profile — stats, abonnement, portail
│   │   │   └── Session/          # SessionSetup
│   │   ├── store/
│   │   │   ├── authStore.js
│   │   │   ├── gameStore.js      # session locale, roulette, history, media
│   │   │   └── sessionStore.js
│   │   ├── hooks/                # (à créer Phase 6 : useSound, useDarkMode)
│   │   ├── services/
│   │   │   └── api.js            # Axios, baseURL=/api (proxy Vite)
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   └── variables.css
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Pack.js
│   │   │   ├── Challenge.js
│   │   │   ├── Session.js
│   │   │   └── GameHistory.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── packs.js
│   │   │   ├── sessions.js
│   │   │   ├── media.js
│   │   │   └── payments.js       # Stripe Checkout + Portal + Webhook
│   │   ├── middlewares/
│   │   │   ├── auth.js           # protect, optionalAuth, requirePremium
│   │   │   └── errorHandler.js
│   │   ├── services/
│   │   │   ├── cloudinary.js     # cloudinary.v2 configuré
│   │   │   └── stripe.js         # stripe SDK initialisé
│   │   └── app.js                # body parser conditionnel pour /webhook
│   ├── scripts/
│   │   └── seed.js               # npm run seed — 7 packs officiels
│   ├── .env
│   ├── .env.example
│   └── server.js
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx/
│   └── nginx.conf
└── CLAUDE.md
```

---

## Git

- Branche `main` : code stable, déployé en production
- Branche `dev` : tout le développement actif
- On merge `dev` → `main` uniquement quand une phase est terminée et stable
- **Ne pas mentionner Claude/Anthropic dans les messages de commit**

---

## Design system

### Couleurs
```css
--bleu-azur: #0057A8
--bleu-azur-dark: #003d7a
--blanc-velodrome: #F5F5F0
--or-etoile: #C9A84C
--or-etoile-light: #e0c070
--rouge-defi: #E63946
--vert-valide: #2DC653
--nuit-goudes: #0D1117  /* dark mode background */
```

### Typographie
- Titres : `Bebas Neue` (Google Fonts)
- Corps : `Nunito`

### Composants clés
- Boutons : forme arrondie style jetons de pétanque (`border-radius: 50px`)
- Transitions : `Vague de la Corniche` (slide horizontal fluide entre pages)
- Animations popups : effet fumigènes (smoke puff Framer Motion)
- Validation : animation `carreau` (snap sec et satisfaisant)

### Dark mode
Nom : **"Nuit sur les Goudes"** — activable manuellement, fond `--nuit-goudes`, persisté en `localStorage`

---

## Sound Design

| Événement | Fichier | Statut |
|---|---|---|
| Roulette qui tourne | `sounds/cigales.mp3` | ⏳ à ajouter |
| Roulette qui s'arrête | `sounds/sifflet.mp3` | ⏳ à ajouter |
| Validation d'un défi | `sounds/carreau.mp3` | ⏳ à ajouter |
| Timer qui expire | `sounds/dramatique.mp3` | ⏳ à ajouter |
| Vote refus | `sounds/soupir.mp3` | ⏳ à ajouter |

Infrastructure son : hook `useSound.js` — fallback silencieux si fichier manquant. Toggle global `soundEnabled` dans `gameStore`.

---

## Décisions architecturales importantes

- **Le jeu est 100% client-side** : la session n'est PAS créée en DB au début. Elle est sauvegardée uniquement en fin de partie via `POST /api/sessions`.
- **PackSelection** : fetche le pack via `GET /api/packs/:id` et construit la session localement, sans appel API.
- **Upload média** : ne requiert pas d'auth (joueurs non connectés peuvent uploader).
- **Port serveur** : `5003` (5000 réservé par macOS AirPlay).
- **Port client** : `5177` avec `strictPort: true` (évite conflit avec autres projets locaux).
- **CORS** : résolu via proxy Vite (`/api` → `http://localhost:5003`). `VITE_API_URL=/api`.
- **Login** : accepte pseudo OU email (champ `login` côté client, logique serveur côté `authController`).
- **Mongoose 9** : hooks pre-save avec `async function()` sans paramètre `next`.
- **Stripe webhook** : nécessite le body brut → middleware conditionnel dans `app.js` qui applique `express.raw()` uniquement sur `/api/payments/webhook`, sinon `express.json()`.
- **Freemium gating** : `Pack.isPremium` + `User.tier` + `User.purchasedPacks`. La méthode `User.isPremiumActive()` vérifie `tier === 'premium'` ET `subscription.currentPeriodEnd` non expirée. Un pack acheté individuellement (`purchasedPacks`) reste accessible même après expiration de l'abonnement.
- **Routes packs protégées** : `GET /packs` retourne `accessible: true/false` + `isMine: true/false` par pack via `optionalAuth` (officiels + packs persos de l'user connecté). `GET /packs/:id` et `GET /packs/share/:code` retournent un `teaser` (1 défi visible, reste masqué) si pas d'accès.
- **Création de packs persos — règles par tier** (enforced server-side dans `POST /packs` et `PUT /packs/:id`) :
  - **Free** : 1 pack max (`PACK_LIMIT_REACHED`), exactement 8 défis, thème forcé à `custom`, **pas de shareCode** (pas de partage), **pas de coverImage**.
  - **Premium** : packs illimités, 8 à 24 défis, tous les thèmes, `shareCode` `nanoid(8)` + QR partageable, `coverImage` Cloudinary.
  - Si un Free passe Premium et édite un de ses packs existants, un `shareCode` lui est généré au prochain `PUT`.
  - Un Premium qui expire perd la capacité d'éditer/créer du contenu Premium ; ses packs existants restent en l'état.
- **shareCode** : non auto-généré en pre-save, contrôlé explicitement par les routes selon le tier. Champ `unique + sparse` côté Mongo pour autoriser plusieurs packs sans shareCode.
- **Navigation arrière** : tous les boutons "← Retour" utilisent `navigate(-1)` pour déclencher le bon sens d'animation (POP).

---

## Modèles MongoDB

### User
```js
{
  username: String (unique),
  email: String (unique),
  password: String (hashé bcrypt, select: false),
  avatar: String (URL Cloudinary),
  tier: 'free' | 'premium',
  subscription: {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: 'active' | 'canceled' | 'past_due' | null,
    currentPeriodEnd: Date,
  },
  purchasedPacks: [ObjectId → Pack],   // packs achetés individuellement (persistants)
  purchasedSkins: [String],            // skins de roulette achetés
  stats: { totalGames, totalChallengesCompleted, totalChallengesRefused },
  customPacks: [ObjectId → Pack],
  createdAt: Date
}

// Méthode : isPremiumActive() → true si tier=premium ET currentPeriodEnd non expirée
```

### Pack
```js
{
  name: String,
  description: String,
  theme: 'marseillais' | 'amis' | 'sportif' | 'couple' | 'enfants' | 'custom',
  isOfficial: Boolean,
  isPremium: Boolean,                  // contenu réservé aux Premium / acheteurs (uniquement sur les packs officiels)
  author: ObjectId → User,
  challenges: [ObjectId → Challenge],  // Free=8 exact, Premium=8 à 24 (validation serveur dans POST/PUT /packs)
  shareCode: String (nanoid 8),        // null pour les packs Free, généré pour les Premium
  coverImage: String (URL Cloudinary), // null pour les Free, optionnel pour les Premium
  isPublic: Boolean,
  createdAt: Date
}
```

### Challenge
```js
{
  text: String,
  intensity: { level: 1|2|3, label: 'Facile'|'Moyen'|'Hard', color: String },
  category: String,
  pack: ObjectId → Pack
}
```

### Session
```js
{
  players: [{ name: String, score: Number, avatar: String }],
  pack: ObjectId → Pack,
  currentPlayerIndex: Number,
  status: 'setup' | 'playing' | 'finished',
  history: [{
    playerName: String,
    challenge: ObjectId → Challenge (optionnel),
    challengeText: String,       // dénormalisé
    result: 'completed' | 'refused' | 'pending',
    points: Number,
    media: [String],             // URLs Cloudinary
    timestamp: Date
  }],
  createdBy: ObjectId → User (optionnel),
  shareLink: String (nanoid 10, unique),  // généré auto en pre-save
  createdAt: Date
}
```

---

## Routes API

### Auth
```
POST   /api/auth/register
POST   /api/auth/login        # body: { login: "pseudo ou email", password }
POST   /api/auth/logout
GET    /api/auth/me
```

### Users
```
GET    /api/users/:id
PUT    /api/users/:id
GET    /api/users/:id/history
```

### Packs
```
GET    /api/packs             # officiels + packs persos de l'user (optionalAuth → flags accessible + isMine)
GET    /api/packs/me/count    # nombre de packs persos de l'user (protect, pour gater le free)
GET    /api/packs/:id         # pack complet OU teaser (1 défi) si pas d'accès
POST   /api/packs             # créer un pack perso (protect, validation Free/Premium)
PUT    /api/packs/:id         # éditer un pack perso (protect, ownership + validation tier)
DELETE /api/packs/:id         # supprime aussi les Challenge orphelins (protect, ownership)
GET    /api/packs/share/:shareCode   # même logique teaser/full selon accès
POST   /api/packs/:id/duplicate      # prévu, non implémenté
```

### Sessions
```
POST   /api/sessions          # sauvegarder une partie terminée (auth optionnelle)
GET    /api/sessions/:id
GET    /api/sessions/gallery/:shareLink   # galerie publique
GET    /api/sessions/user/me              # historique de l'utilisateur connecté
```

### Médias
```
POST   /api/media/upload      # upload vers Cloudinary (sans auth requise)
DELETE /api/media/:publicId   # (protect)
```

### Paiements (Stripe)
```
POST   /api/payments/create-checkout-session   # body: { billing: 'monthly' | 'annual' } (protect)
POST   /api/payments/portal                    # Billing Portal Stripe (protect)
GET    /api/payments/subscription              # statut courant (protect)
POST   /api/payments/webhook                   # signature Stripe + raw body
```

**Webhook events gérés** :
- `checkout.session.completed` → active la subscription (tier='premium')
- `customer.subscription.updated` → sync status + currentPeriodEnd
- `customer.subscription.deleted` → tier='free', status='canceled' (purchasedPacks préservés)
- `invoice.payment_failed` → status='past_due'

---

## Phases de développement

### Phase 1 — Fondations backend ✅
- [x] Init repo + structure dossiers + git (main + dev)
- [x] Setup Node/Express + MongoDB + Mongoose
- [x] Variables d'environnement (.env.example)
- [x] Models : User, Pack, Challenge, Session, GameHistory
- [x] Route POST /api/auth/register (hash bcrypt)
- [x] Route POST /api/auth/login (JWT) — accepte pseudo ou email
- [x] Route GET /api/auth/me (middleware JWT)
- [x] Middleware d'erreur global

### Phase 2 — UI Core ✅
- [x] Init Vite 8 + React Router + Zustand + Framer Motion
- [x] Design system : variables CSS, fonts, composants de base
- [x] Page Home (landing, affiche user connecté)
- [x] Page Auth (Login / Register)
- [x] Page Session Setup (noms joueurs, min 2 max 10)
- [x] Page Choix du Pack
- [x] Composant Roulette animée 8 cases
- [x] Page Game (phases : idle → spinning → challenge → vote → result → endgame)
- [x] Stores Zustand : authStore, gameStore, sessionStore
- [x] Layout desktop 2 colonnes (roulette gauche, contenu droite)

### Phase 3 — Contenu ✅
- [x] Seed MongoDB : 7 packs officiels (56 défis)
- [x] Routes GET /api/packs (officiels + persos de l'user via $or)
- [x] Page Bibliothèque de packs (sections "Mes packs" + "Packs officiels")
- [x] Éditeur de listes perso (protégé)
- [x] Route POST /api/packs (création pack custom avec règles Free/Premium)
- [x] Route PUT /api/packs/:id (édition + remplacement complet des Challenge)
- [x] Route DELETE /api/packs/:id (cascade Challenge)
- [x] shareCode unique par pack (nanoid 8) — généré uniquement pour les Premium
- [x] QR code (qrcode.react) + modale partage (PackLibrary + écran succès Editor)
- [x] Modale de confirmation de suppression (fumigène)
- [ ] Duplication d'un pack officiel

### Phase 4 — Gameplay ✅
- [x] PastisTimer animé (durée selon intensité : 45/30/20s)
- [x] Système de vote (VotePanel, majorité)
- [x] Scoring : Facile=1pt, Moyen=2pts, Hard=3pts
- [x] Bouton "C'est pas ma faute !" — relance la roulette
- [x] Mode Exagérateur x2
- [x] Commentaires aléatoires après chaque spin (10 phrases)
- [x] Écran EndGame : podium 🥇🥈🥉, confettis, stats fun
- [x] Sauvegarde session en fin de partie
- [x] Feature cachée "Radar à Parisiens" (sonar animé Easter egg)

### Phase 5 — Médias ✅
- [x] Setup Cloudinary (stream direct, sans multer-storage-cloudinary)
- [x] Route POST /api/media/upload (sans auth)
- [x] Composant MediaUpload dans phase result
- [x] Page Galerie /gallery/:shareLink (publique, lightbox)
- [x] Page Historique /history (protégée)
- [x] Session sauvegardée avec history + media + shareLink

### Phase 6 — Polish (Design, Sons, PWA) ✅
- [x] Dark mode "Nuit sur les Goudes" (toggle + localStorage)
- [x] Hook useSound + toggle global `soundEnabled` (gameStore) — synthèse Web Audio (sons .mp3 optionnels, non bloquants pour V1)
- [x] Transitions "Vague de la Corniche" (slide directionnel selon `useNavigationType`)
- [x] Texture pierre overlay CSS (body::before fractalNoise)
- [x] Bouton "← Retour" léger (`.btn-back` minimaliste)
- [x] Animation "carreau" sur validations (auto sur `.btn-primary`, `.btn-gold`, `.btn-danger`, `.btn-end-game`)
- [x] Animations fumigènes sur popups (`styles/motion.js` — VotePanel, PaywallModal, Radar modal, commentaires roulette)
- [x] Setup PWA (vite-plugin-pwa) : manifest complet (icônes 64/192/512 + maskable), service worker en prod (`registerSW` dans main.jsx), offline cache (API + Cloudinary)
- [x] Responsive final check (media queries 768/1024/1440 sur toutes les pages)

### Phase 6.5 — Freemium & Paiements ✅
- [x] Modèle User : `tier`, `subscription`, `purchasedPacks`, `purchasedSkins`
- [x] Méthode `User.isPremiumActive()`
- [x] Champ `Pack.isPremium` (gating consommation des officiels)
- [x] Champ `Pack.coverImage` (Premium uniquement, URL Cloudinary)
- [x] Middlewares `optionalAuth` + `requirePremium`
- [x] Routes packs avec gating serveur (teaser 1 défi pour non-premium)
- [x] Liste `GET /packs` avec flags `accessible` + `isMine` par pack
- [x] Page `/premium` (toggle mensuel/annuel + comparatif features)
- [x] Page `/premium/success` (refresh user + animation trophée + poll subscription)
- [x] Page `/profile` (stats, abonnement, portail Stripe, raccourcis)
- [x] Composant `PaywallModal` (clic sur pack verrouillé → teaser + CTA)
- [x] Stripe Checkout (création session)
- [x] Stripe Billing Portal (gestion / annulation)
- [x] Webhook Stripe (signature + body brut conditionnel, fallback robuste sur `current_period_end`)
- [x] Persistance des packs achetés après expiration de l'abonnement
- [x] **Création de packs perso — gating par tier** :
  - Free : 1 pack max (gate paywall si limite atteinte), 8 défis exactement, thème custom forcé, pas de shareCode, pas de cover
  - Premium : packs illimités, 8-24 défis, tous thèmes, shareCode + QR, cover Cloudinary
- [x] Editor en mode édition (`/editor/:id`) avec chargement du pack existant
- [x] Banner upsell Free dans l'Editor
- [x] Modale de partage (QR + lien) accessible depuis chaque pack perso de l'user
- [x] Modale de confirmation de suppression (fumigène)
- [x] Script `server/scripts/fix-premium-period.js` pour resync `currentPeriodEnd` depuis Stripe

### Phase 7 — Déploiement OVH
- [ ] Dockerfile client (Vite build + Nginx)
- [ ] Dockerfile server (Node.js)
- [ ] docker-compose.prod.yml
- [ ] Nginx config (reverse proxy, gzip, headers sécurité)
- [ ] Certbot SSL
- [ ] Variables d'environnement production
- [ ] Script de déploiement
- [ ] Monitoring basique

---

## Packs de défis — Contenu

### Pack "Mireille" (Défis de daronne)
1. Raconte une embrouille de 10 min pour un truc qui a duré 2 secondes
2. Imite ta mère qui appelle quelqu'un qui est à 3 mètres de toi
3. Explique ce que tu as mangé hier soir comme si c'était un plat gastronomique 3 étoiles
4. Donne ton avis sur la météo d'aujourd'hui pendant 2 minutes minimum
5. Fais semblant d'appeler le voisin du dessus pour lui dire de faire moins de bruit
6. Raconte comment tu as failli rater le bus comme si c'était un film d'action
7. Explique à quelqu'un comment aller aux toilettes chez toi
8. Imite quelqu'un qui attend le bus depuis 45 minutes

### Pack "Virage Sud" (Défis de supporters)
1. Chante l'hymne de l'OM sans perdre la voix, sinon tu payes ta tournée
2. Décris le plus beau but que t'as vu de ta vie (réel ou imaginaire)
3. Explique pourquoi l'arbitre du dernier match était corrompu
4. Imite un commentateur sportif sur une action banale (quelqu'un qui se lève)
5. Fais le discours de vestiaire du coach avant un match décisif
6. Célèbre un but imaginaire comme si t'étais au stade
7. Explique la tactique que tu aurais utilisée si t'avais été coach
8. Imite un joueur qui se roule par terre après un tacle bénin

### Pack "Mouloud le Pêcheur" (Défis d'exagération)
1. Décris la taille de la sardine qui a bouché le port, les mains écartées à plus de 2 mètres
2. Raconte le poisson que t'as pêché (il grossit à chaque phrase)
3. Décris la chaleur qu'il faisait l'été dernier comme si c'était le soleil de Mercure
4. Explique combien de temps t'as attendu au restaurant (ça doit durer au moins 3 jours)
5. Décris l'embouteillage sur la Corniche comme si c'était l'apocalypse
6. Raconte à quel point tu dormais peu quand t'étais jeune
7. Explique combien tu marchais loin pour aller à l'école (sans voiture évidemment)
8. Décris ton record sportif personnel (ça doit battre Usain Bolt)

---

## Variables d'environnement

### server/.env.example
```
PORT=5003
MONGODB_URI=mongodb://localhost:27017/roulade-marseillaise
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name   # identifiant lowercase Cloudinary
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx         # affiché par `stripe listen` en local
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_ANNUAL=price_xxx
CLIENT_URL=http://localhost:5177
NODE_ENV=development
```

⚠️ **Attention dotenv** : pas d'espaces en début de ligne, et toujours préfixer les commentaires par `#`. Sinon les variables sont silencieusement ignorées.

### client/.env.example
```
VITE_API_URL=/api
VITE_APP_NAME=La Roulade Marseillaise
```

### Stripe en développement local
```
stripe listen --forward-to localhost:5003/api/payments/webhook
```
Récupérer le `whsec_...` affiché et le mettre dans `STRIPE_WEBHOOK_SECRET`.

---

## Règles de code

- Pas de commentaires sauf pour la logique non évidente
- Pas d'over-engineering : si ça peut être simple, ça reste simple
- Validation des entrées uniquement aux frontières (formulaires, API)
- Toujours gérer les erreurs côté API avec des messages en français marseillais
- Les sons et animations sont toujours optionnels (accessibilité)
- Ne pas mentionner Claude/Anthropic dans les commits git
