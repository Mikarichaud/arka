# La Roulade Marseillaise by ARKA — CLAUDE.md

## Vision du projet

Application web mobile-first de jeu de défis en tour par tour. Une roulette fictive 8 cases s'anime et s'arrête sur un défi que le joueur doit réaliser. Ambiance 100% marseillaise : design, sons, textes, humour.

Jeu **physique** (les joueurs sont dans la même pièce), **pas de multijoueur temps réel**. Chaque joueur joue à son tour sur le même écran.

---

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | React 18 + Vite, React Router v6, Zustand, Framer Motion |
| Backend | Node.js + Express |
| Base de données | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| Médias | Cloudinary (photo/vidéo) + Multer |
| QR Code | qrcode.react |
| PWA | Vite PWA plugin |
| Déploiement | Docker Compose + Nginx + Certbot sur OVH |

---

## Structure du repo (monorepo)

```
la-roulade-marseillaise/
├── client/                   # React + Vite
│   ├── public/
│   │   ├── sounds/           # Fichiers audio (cigales, TÉ!, HÉ BÉ!, sifflet, erreur)
│   │   └── textures/         # Images de fond (pierre Vallon des Auffes, etc.)
│   ├── src/
│   │   ├── assets/           # Images, icônes, fonts
│   │   ├── components/       # Composants réutilisables
│   │   │   ├── Roulette/     # Composant roulette animée
│   │   │   ├── ChallengeCard/
│   │   │   ├── PastisTimer/
│   │   │   ├── PlayerCard/
│   │   │   ├── QRCodeShare/
│   │   │   └── VotePanel/
│   │   ├── pages/
│   │   │   ├── Home/
│   │   │   ├── Auth/         # Login + Register
│   │   │   ├── Session/      # Setup joueurs + choix pack
│   │   │   ├── Game/         # Écran de jeu principal
│   │   │   ├── Editor/       # Éditeur de listes perso
│   │   │   ├── Packs/        # Bibliothèque de packs
│   │   │   ├── History/      # Historique des parties
│   │   │   ├── Profile/      # Profil utilisateur
│   │   │   └── Gallery/      # Galerie de session (photos/vidéos)
│   │   ├── store/            # Zustand stores
│   │   │   ├── authStore.js
│   │   │   ├── gameStore.js
│   │   │   └── sessionStore.js
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # Appels API (axios)
│   │   ├── utils/            # Helpers (QR, timer, sons...)
│   │   ├── styles/           # CSS global + variables (thème)
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js
│
├── server/
│   ├── src/
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
│   │   │   ├── challenges.js
│   │   │   ├── sessions.js
│   │   │   └── media.js
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   │   ├── auth.js       # Vérification JWT
│   │   │   └── upload.js     # Multer config
│   │   ├── services/
│   │   │   └── cloudinary.js
│   │   └── app.js
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

---

## Design system

### Couleurs
```css
--bleu-azur: #0057A8
--blanc-velodrome: #F5F5F0
--or-etoile: #C9A84C
--rouge-defi: #E63946
--vert-valide: #2DC653
--nuit-goudes: #0D1117  /* dark mode background */
```

### Typographie
- Titres : fonte bold impact-style (à définir)
- Corps : Nunito ou Inter

### Composants clés
- Boutons : forme arrondie style jetons de pétanque
- Fonds : texture pierre du Vallon des Auffes (subtile, en overlay)
- Transitions : `Vague de la Corniche` (effet slide horizontal fluide entre pages)
- Animations popups : effet fumigènes (smoke puff avec Framer Motion)
- Validation : animation `carreau` (snap sec et satisfaisant)

### Dark mode
Nom : **"Nuit sur les Goudes"** — activable manuellement, fond `--nuit-goudes`

---

## Sound Design

| Événement | Son |
|---|---|
| Roulette qui tourne | Cigales qui s'excitent (accélèrent avec la vitesse) |
| Roulette qui s'arrête | Coup de sifflet d'arbitre + "TÉ !" ou "HÉ BÉ !" |
| Validation d'un défi | Claquement de carreau sec |
| Erreur / champ vide | Vibration + "Oh fada, tu nous as pris pour des touristes ? Remplis la case !" |
| Timer qui expire | Son dramatique + animation verre vide |
| Vote refus | Soupir marseillais |

Tous les sons sont dans `client/public/sounds/`. Le son est activable/désactivable globalement.

---

## Modèles MongoDB

### User
```js
{
  username: String (unique),
  email: String (unique),
  password: String (hashé bcrypt),
  avatar: String (URL Cloudinary),
  stats: {
    totalGames: Number,
    totalChallengesCompleted: Number,
    totalChallengesRefused: Number,
  },
  customPacks: [{ type: ObjectId, ref: 'Pack' }],
  createdAt: Date
}
```

### Pack
```js
{
  name: String,
  description: String,
  theme: String,           // 'marseillais' | 'amis' | 'sportif' | 'couple' | 'enfants' | 'custom'
  isOfficial: Boolean,     // packs prédéfinis vs packs utilisateur
  author: { type: ObjectId, ref: 'User' },
  challenges: [{ type: ObjectId, ref: 'Challenge' }],  // exactement 8
  shareCode: String,       // code unique pour import/export
  isPublic: Boolean,
  createdAt: Date
}
```

### Challenge
```js
{
  text: String,            // description du défi
  intensity: {
    level: Number,         // 1 (easy) à 3 (hard)
    label: String,         // 'Facile' | 'Moyen' | 'Hard'
    color: String          // '#2DC653' | '#C9A84C' | '#E63946'
  },
  category: String,
  pack: { type: ObjectId, ref: 'Pack' }
}
```

### Session
```js
{
  players: [{ name: String, score: Number, avatar: String }],
  pack: { type: ObjectId, ref: 'Pack' },
  currentPlayerIndex: Number,
  currentSpinResult: Number,  // index 0-7
  status: String,             // 'setup' | 'playing' | 'finished'
  history: [{
    player: String,
    challenge: { type: ObjectId, ref: 'Challenge' },
    result: String,           // 'completed' | 'refused'
    media: [String],          // URLs Cloudinary
    timestamp: Date
  }],
  createdBy: { type: ObjectId, ref: 'User' },
  shareLink: String,          // lien galerie publique
  createdAt: Date
}
```

### GameHistory
```js
{
  session: { type: ObjectId, ref: 'Session' },
  user: { type: ObjectId, ref: 'User' },
  players: [String],
  packUsed: String,
  totalRounds: Number,
  highlights: [String],       // URLs médias uploadés
  createdAt: Date
}
```

---

## Routes API

### Auth
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Users
```
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/users/:id/history
```

### Packs
```
GET    /api/packs                  # tous les packs officiels
GET    /api/packs/:id
POST   /api/packs                  # créer un pack perso
PUT    /api/packs/:id
DELETE /api/packs/:id
GET    /api/packs/share/:shareCode # import par code/QR
POST   /api/packs/:id/duplicate    # copier un pack officiel pour le modifier
```

### Sessions
```
POST   /api/sessions               # créer une session
GET    /api/sessions/:id
PUT    /api/sessions/:id           # update (score, tour, etc.)
POST   /api/sessions/:id/spin      # résultat du spin
POST   /api/sessions/:id/vote      # soumettre un vote
GET    /api/sessions/:id/gallery   # galerie publique
```

### Médias
```
POST   /api/media/upload           # upload photo/vidéo → Cloudinary
DELETE /api/media/:publicId
```

---

## Phases de développement

### Phase 1 — Fondations backend
- [ ] Init repo + structure dossiers + git (main + dev)
- [ ] Setup Node/Express + MongoDB + Mongoose
- [ ] Variables d'environnement (.env.example)
- [ ] Model User + Model Pack + Model Challenge + Model Session + Model GameHistory
- [ ] Route POST /api/auth/register (hash bcrypt)
- [ ] Route POST /api/auth/login (génération JWT)
- [ ] Route GET /api/auth/me (middleware auth JWT)
- [ ] Middleware d'erreur global
- [ ] Tests manuels Postman/Thunder Client

### Phase 2 — UI Core (Roulette + Session setup)
- [ ] Init Vite React + React Router + Zustand + Framer Motion
- [ ] Design system : variables CSS, fonts, composants de base
- [ ] Page Home (landing)
- [ ] Page Auth (Login / Register)
- [ ] Page Session Setup : saisir les noms des joueurs (min 2, max 10), ordre aléatoire ou manuel
- [ ] Page Choix du Pack : liste des packs dispo, aperçu des 8 cases
- [ ] Composant Roulette : animation 8 cases, spin, atterrissage sur une case avec effet physique (décélération réaliste)
- [ ] Page Game : affichage du défi, nom du joueur actif, score en cours
- [ ] Store Zustand : sessionStore (joueurs, scores, tour actuel)
- [ ] Store Zustand : gameStore (état de la roulette, défi en cours)

### Phase 3 — Contenu (Packs + Éditeur + Partage)
- [ ] Seed MongoDB : packs officiels prédéfinis
  - Pack "Soirée entre amis"
  - Pack "Défis sportifs"
  - Pack "Couple"
  - Pack "Enfants"
  - Pack "Mireille" (défis de daronne marseillaise)
  - Pack "Virage Sud" (défis de supporters OM)
  - Pack "Mouloud le Pêcheur" (défis d'exagération)
- [ ] Routes GET /api/packs (avec filtres par thème)
- [ ] Page Bibliothèque de packs
- [ ] Éditeur de listes perso : créer/nommer/sauvegarder 8 défis avec niveau d'intensité par case
- [ ] Route POST /api/packs (création pack custom)
- [ ] Génération shareCode unique par pack custom
- [ ] Génération QR code (qrcode.react) + lien de partage
- [ ] Route GET /api/packs/share/:shareCode (import depuis QR ou lien)
- [ ] Duplication d'un pack officiel pour modification

### Phase 4 — Gameplay (Timer, Vote, Scoring)
- [ ] Pastis-Timer : composant verre de pastis animé qui se vide, durée configurable par défi
- [ ] Système de vote : après un défi, les autres joueurs valident ou refusent à la majorité
- [ ] Calcul des scores selon l'intensité du défi (Facile=1pt, Moyen=2pts, Hard=3pts)
- [ ] Bouton "C'est pas ma faute !" : relance la roulette avec excuse aléatoire
- [ ] Mode "L'Exagérateur" : multiplicateur de score x2 si activé
- [ ] Commentaires aléatoires après chaque spin
  - "Oh, c'est cadeau ça !"
  - "À ta place, je rentrerais à la maison direct !"
  - "Même mon minot il le fait les yeux fermés !"
- [ ] Écran de fin de session : classement, MVP, stats rigolotes
- [ ] Sauvegarde session terminée → GameHistory
- [ ] Feature cachée "Radar à Parisiens" : bouton rouge discret dans l'UI, active un faux sonar animé qui "scanne" la zone et affiche "C'est bon, y'en a pas ici, on est entre nous."

### Phase 5 — Médias (Photos/Vidéos)
- [ ] Setup Cloudinary + Multer côté serveur
- [ ] Route POST /api/media/upload
- [ ] Composant upload dans l'écran de jeu (après un défi complété)
- [ ] Affichage miniatures dans le fil de la session
- [ ] Page Galerie de session : grille photos/vidéos, accessible via lien public unique
- [ ] Page Historique profil : liste des sessions passées avec accès aux galeries

### Phase 6 — Polish (Design, Sons, PWA)
- [ ] Intégration sons (tous les événements du sound design)
- [ ] Toggle son ON/OFF global
- [ ] Transitions "Vague de la Corniche" entre toutes les pages (Framer Motion)
- [ ] Animations fumigènes sur les popups et modales
- [ ] Animation "carreau" sur les validations
- [ ] Texture pierre en overlay sur les fonds
- [ ] Dark mode "Nuit sur les Goudes" (toggle + persistence localStorage)
- [ ] Setup PWA (Vite PWA plugin) : manifest, service worker, icônes
- [ ] Mode offline : packs déjà chargés restent disponibles sans réseau
- [ ] Responsive check sur tous les écrans mobiles courants

### Phase 7 — Déploiement OVH
- [ ] Dockerfile client (build Vite + Nginx statique)
- [ ] Dockerfile server (Node.js)
- [ ] docker-compose.prod.yml (client + server + MongoDB)
- [ ] Configuration Nginx (reverse proxy, gzip, headers sécurité)
- [ ] Certbot SSL (HTTPS)
- [ ] Variables d'environnement production
- [ ] Script de déploiement (pull + rebuild + restart)
- [ ] Test de charge léger
- [ ] Monitoring basique (logs Nginx + PM2 ou Docker logs)

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
PORT=5000
MONGODB_URI=mongodb://localhost:27017/roulade-marseillaise
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
```

### client/.env.example
```
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=La Roulade Marseillaise
```

---

## Règles de code

- Pas de commentaires sauf pour la logique non évidente
- Pas d'over-engineering : si ça peut être simple, ça reste simple
- Validation des entrées uniquement aux frontières (formulaires, API)
- Toujours gérer les erreurs côté API avec des messages en français marseillais quand c'est côté utilisateur
- Les sons et animations sont toujours optionnels (accessibilité)
