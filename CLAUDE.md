# La Roulade Marseillaise by ARKA — CLAUDE.md

## Vision du projet

Application web mobile-first de jeu de défis en tour par tour. Une roulette fictive 8 cases s'anime et s'arrête sur un défi que le joueur doit réaliser. Ambiance 100% marseillaise : design, sons, textes, humour.

**Deux modes de jeu** :
- **Mode local** : jeu physique, tous les joueurs dans la même pièce, un seul écran (pseudo-multi sur un device). Chaque joueur joue à son tour.
- **Mode Salon** : multijoueur temps réel synchronisé, chaque joueur sur son propre téléphone. Création Premium-only (les gatés admin passent automatiquement), invitation par QR/code. Salon **persistant** (groupe qui survit aux soirées et accumule l'historique des parties), accessible via la page **Mes salons** (`/salons`). Salon privé, max 10 joueurs.

**Statut** : en production sur **arka.michaelrichaud.fr**. Toutes les phases code livrées (1-9). Restent post-déploiement : Stripe LIVE, OG image dédiée, Search Console submission, Phase 8.2 contenu/backlinks.

---

## Stack technique

| Couche | Techno |
|---|---|
| Frontend | React 19.2 + Vite 8, React Router v7, Zustand 5, Framer Motion 12 |
| Backend | Node.js 22 + Express 5 |
| Base de données | MongoDB 7 + Mongoose 9 |
| Auth | JWT (1d expiry default) + bcryptjs |
| Médias | Cloudinary v2 (stream direct) + Multer (memoryStorage) |
| Paiements | Stripe (Checkout + Billing Portal + Webhooks) |
| QR Code | qrcode.react |
| Temps réel | Socket.IO 4 (server + client) — rooms par salon, state en mémoire + snapshots Mongo |
| PWA | vite-plugin-pwa |
| SEO | react-helmet-async + sitemap dynamique server-side |
| Sécurité | helmet + express-rate-limit + CSP nginx, `npm audit` 0 vuln |
| Déploiement | Docker Compose + Nginx + Certbot Let's Encrypt sur VPS OVH Debian 12 |

---

## Structure du repo (monorepo)

```
la-roulade-marseillaise/
├── client/                                # React + Vite
│   ├── public/
│   │   ├── sounds/                        # Fichiers audio (vide — sons via Web Audio synth)
│   │   ├── robots.txt                     # SEO : Allow public, Disallow privé
│   │   ├── favicon.ico, pwa-*.png         # Icônes PWA + favicon
│   │   └── pwa-icon-source.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChallengeCard/
│   │   │   ├── CosmeticCard/              # Carte cosmétique unifiée (boutique + profil)
│   │   │   ├── EmptyState/                # États vides homogènes (icône + titre + actions)
│   │   │   ├── EndGame/                   # Écran fin de partie + confettis
│   │   │   ├── HomeRoulette/              # Roulette d'accueil cliquable
│   │   │   ├── Icon/
│   │   │   ├── Layout/                    # Wrapper page + animation slide
│   │   │   ├── LoadingPlaceholder/        # Skeletons animés (shimmer GPU-friendly)
│   │   │   ├── MediaUpload/               # Upload photo/vidéo Cloudinary (Premium only)
│   │   │   ├── PastisTimer/
│   │   │   ├── PaywallModal/              # Modale teaser pack premium
│   │   │   ├── PlayerCard/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── RadarParisiens/            # Easter egg autonome
│   │   │   ├── Roulette/
│   │   │   ├── RoulettePreview/           # Mini-roulette statique pour shop/profil
│   │   │   ├── SEO/                       # <SEO> centralisé (Helmet + OG + Twitter + JSON-LD)
│   │   │   └── VotePanel/
│   │   ├── pages/
│   │   │   ├── Auth/                      # Login + Register
│   │   │   ├── Editor/                    # Éditeur de packs perso (protégé)
│   │   │   ├── Gallery/                   # /gallery/:shareLink — public (SEO)
│   │   │   ├── Game/                      # Écran de jeu local
│   │   │   ├── Gate/                      # /gate/packs + /gate/cosmetics — admin
│   │   │   ├── History/                   # /history — protégé
│   │   │   ├── Home/                      # Landing + section À propos indexable
│   │   │   ├── Packs/                     # PackLibrary unifiée packs + cosmétiques
│   │   │   ├── Premium/                   # Pricing + success
│   │   │   ├── Profile/                   # Stats, abonnement, portail Stripe
│   │   │   ├── Salon/                     # SalonNew, SalonJoin, SalonLobby (+SalonGame),
│   │   │   │                              # MesSalons, SalonHistory, SalonToast
│   │   │   └── Session/                   # SessionSetup wizard (joueurs → pack)
│   │   ├── store/
│   │   │   ├── authStore.js
│   │   │   ├── gameStore.js               # state machine gameplay local (persist)
│   │   │   ├── sessionStore.js            # config partie courante locale
│   │   │   ├── settingsStore.js           # theme + soundEnabled (persist localStorage)
│   │   │   └── salonStore.js              # état du salon courant (Phase 9)
│   │   ├── hooks/
│   │   │   ├── useSound.js                # Web Audio synth (spin/stop/validate/refuse/arrive)
│   │   │   ├── useActiveSkin.js           # Cosmétique actif par catégorie
│   │   │   ├── useCategories.js           # Cache module-level
│   │   │   ├── useEscapeClose.js          # ESC ferme modale
│   │   │   └── useSalonSocket.js          # Connexion Socket.IO + handlers + auto-reconnect iOS
│   │   ├── services/
│   │   │   ├── api.js                     # Axios baseURL=/api
│   │   │   └── salonStorage.js            # localStorage arka-salon-<code>
│   │   ├── utils/
│   │   │   └── permissions.js             # hasPremiumAccess (tier OR role=gate)
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── variables.css
│   │   │   └── motion.js                  # Framer Motion variants (fumigènes, etc.)
│   │   ├── App.jsx                        # Routes + AnimatedRoutes (slide directionnel)
│   │   └── main.jsx                       # HelmetProvider + StrictMode + SW register
│   ├── index.html
│   ├── nginx.conf                         # Reverse proxy + CSP + Socket.IO upgrade + sitemap
│   ├── Dockerfile                         # Multi-stage Vite build + Nginx alpine
│   ├── vite.config.js                     # PWA + proxy /api (ws: true)
│   └── package.json                       # overrides ws:^8.20.1 (CVE patch)
│
├── server/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/
│   │   │   ├── User.js                    # tier + role gate + activeSkins Map
│   │   │   ├── Pack.js
│   │   │   ├── Challenge.js
│   │   │   ├── Session.js                 # historique parties locales
│   │   │   ├── GameHistory.js             # legacy
│   │   │   ├── Category.js                # catégories dynamiques (replace enum theme)
│   │   │   ├── Cosmetic.js                # Stripe Products auto-sync
│   │   │   └── Salon.js                   # groupe persistant + currentGame + games[]
│   │   ├── routes/
│   │   │   ├── auth.js                    # register (validation regex) + login + me
│   │   │   ├── users.js                   # GET /:id projection si pas owner
│   │   │   ├── packs.js                   # CRUD + teaser si pas accès
│   │   │   ├── sessions.js                # sauvegarde partie locale
│   │   │   ├── media.js                   # upload Cloudinary (requirePremium)
│   │   │   ├── payments.js                # Stripe Checkout + Portal + Webhook
│   │   │   ├── gate.js                    # CRUD packs/categories/cosmetics admin
│   │   │   ├── categories.js              # GET public
│   │   │   ├── cosmetics.js               # GET public + checkout
│   │   │   ├── salons.js                  # CRUD + resume + history + media upload
│   │   │   └── sitemap.js                 # /sitemap.xml dynamique SEO
│   │   ├── sockets/
│   │   │   ├── index.js                   # initSockets + salon:join/leave/destroy
│   │   │   ├── game.js                    # game:* events + skip offline players
│   │   │   └── lifecycle.js               # recovery boot + cleanup TTL 2h
│   │   ├── middlewares/
│   │   │   ├── auth.js                    # protect, optionalAuth, requirePremium,
│   │   │   │                              # requireGate, requireSalonMember
│   │   │   └── errorHandler.js
│   │   ├── services/
│   │   │   ├── cloudinary.js              # v2 (CVE patché)
│   │   │   └── stripe.js
│   │   ├── controllers/authController.js
│   │   └── app.js                         # helmet + CORS + rate limit + body parser
│   ├── scripts/
│   │   ├── seed-categories.js
│   │   ├── seed-packs.js                  # Mireille, Virage Sud, Mouloud
│   │   ├── seed-cosmetics.js              # 3 skins roulette + Stripe sync
│   │   └── fix-premium-period.js          # resync abos Stripe
│   ├── .env, .env.example
│   ├── server.js                          # httpServer + Socket.IO + lifecycle
│   ├── Dockerfile                         # Node 22 alpine, npm ci --omit=dev
│   └── package.json                       # overrides ws:^8.20.1 (CVE patch)
│
├── scripts/
│   ├── init-ssl.sh                        # Let's Encrypt premier cert
│   ├── deploy.sh                          # git pull + rebuild + restart
│   └── setup-vps.md                       # Doc complète setup VPS Debian
│
├── docker-compose.yml                     # Dev (server + client)
├── docker-compose.prod.yml                # Prod (server + client + certbot)
├── .env.production.example
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

Tous les sons sont **synthétisés via Web Audio API** (pas de fichiers .mp3 à fournir). Le hook `useSound.js` expose `play(name)` et `playSound(name)` (version standalone hors composant pour les event handlers socket).

| Événement | Preset | Synthèse |
|---|---|---|
| Roulette qui tourne | `spin` | Bruit blanc filtré bandpass 600Hz, decay 250ms |
| Roulette qui s'arrête | `stop` | Sine 1100→440Hz exponential decay, 450ms |
| Validation d'un défi | `validate` | 2 carrés 660+880Hz cascadés |
| Refus / défi raté | `refuse` | Sawtooth 280→130Hz exponential decay |
| Timer expire | `timer` | 2 sine 220+185Hz cascadés |
| Joueur arrive en salon | `arrive` | 3 sine Do-Mi-Sol (523-659-784Hz) en cascade |

Toggle global `soundEnabled` dans `useSettingsStore` (persisté localStorage `roulade-sound`). Les sons salon (`spin`/`stop`/`validate`/`refuse`) sont **synchronisés multi-device** : ils déclenchent simultanément sur tous les phones au moment précis du `startAt` calculé serveur.

---

## Décisions architecturales importantes

- **Le jeu est 100% client-side** : la session n'est PAS créée en DB au début. Elle est sauvegardée uniquement en fin de partie via `POST /api/sessions` (auth obligatoire ; non-connectés peuvent jouer mais pas sauvegarder).
- **SessionSetup en wizard 2 étapes** (un seul composant, pas de route séparée) : étape 1 = pseudos des joueurs avec CTA primary "Choisir le pack →" ; étape 2 = grille des packs avec CTA gold "Lancer la Roulade !". Indicateur de progression (pastilles 1-2) dans le header. Le bouton "← Retour" en étape 2 ramène à l'étape 1, en étape 1 sort vers Home (`location.key !== 'default' ? navigate(-1) : navigate('/')`). Si `preselectedPackId` est fourni en `location.state` (depuis PackLibrary), le pack est pré-sélectionné et l'étape 1 lance directement la partie (skip étape 2). Les packs avec `isMine: true` sont triés en tête de la grille.
- **Upload média (photos/vidéos)** : réservé aux Premium (et gatés via gate=premium). Côté serveur `POST /api/media/upload` est gated par `protect + requirePremium`. Côté client, `<MediaUpload>` n'est rendu dans Game.jsx que si `hasPremiumAccess(user)`, sinon un upsell discret pointe vers `/premium`.
- **Port serveur** : `5003` (5000 réservé par macOS AirPlay).
- **Port client** : `5177` avec `strictPort: true` (évite conflit avec autres projets locaux).
- **CORS** : résolu via proxy Vite (`/api` → `http://localhost:5003`). `VITE_API_URL=/api`.
- **Login** : accepte pseudo OU email (champ `login` côté client, logique serveur côté `authController`).
- **Mongoose 9** : hooks pre-save avec `async function()` sans paramètre `next`.
- **Stripe webhook** : nécessite le body brut → middleware conditionnel dans `app.js` qui applique `express.raw()` uniquement sur `/api/payments/webhook`, sinon `express.json()`.
- **Freemium gating** : `Pack.isPremium` + `User.tier` + `User.purchasedPacks`. La méthode `User.isPremiumActive()` retourne `true` si `role === 'gate'` (admin) OU si `tier === 'premium'` ET `subscription.currentPeriodEnd` non expirée. Un pack acheté individuellement (`purchasedPacks`) reste accessible même après expiration de l'abonnement. Côté client, helper miroir `hasPremiumAccess(user)` dans `client/src/utils/permissions.js`.
- **Routes packs protégées** : `GET /packs` retourne `accessible: true/false` + `isMine: true/false` par pack via `optionalAuth` (officiels + packs persos de l'user connecté). `GET /packs/:id` et `GET /packs/share/:code` retournent un `teaser` (1 défi visible, reste masqué) si pas d'accès.
- **Création de packs persos — règles par tier** (enforced server-side dans `POST /packs` et `PUT /packs/:id`) :
  - **Free** : 1 pack max (`PACK_LIMIT_REACHED`), exactement 8 défis, thème forcé à `custom`, **pas de shareCode** (pas de partage), **pas de coverImage**.
  - **Premium** : packs illimités, 8 à 24 défis, tous les thèmes, `shareCode` `nanoid(8)` + QR partageable, `coverImage` Cloudinary.
  - Si un Free passe Premium et édite un de ses packs existants, un `shareCode` lui est généré au prochain `PUT`.
  - Un Premium qui expire perd la capacité d'éditer/créer du contenu Premium ; ses packs existants restent en l'état.
- **shareCode** : non auto-généré en pre-save, contrôlé explicitement par les routes selon le tier. Champ `unique + sparse` côté Mongo pour autoriser plusieurs packs sans shareCode.
- **Rôle admin "gaté"** : `User.role: 'user' | 'gate'`, default `'user'`. Promotion manuelle en DB (`db.users.updateOne(..., { $set: { role: 'gate' } })`). Middleware `requireGate` + `ProtectedRoute gateOnly`. Donne accès aux espaces `/gate/packs` (CRUD packs officiels + catégories) et `/gate/cosmetics` (CRUD cosmétiques + Stripe sync).
- **Catégories dynamiques** : `Category` model avec `slug`, `name`, `icon` (nom d'icône SVG du composant `Icon`), `order`. Remplace l'enum hardcodé `Pack.theme`. Validation server-side : un thème inconnu retombe sur `custom`. Cascade rename : si le slug d'une catégorie change, tous les `Pack.theme` qui l'utilisaient sont mis à jour. Suppression bloquée si la catégorie est utilisée. La catégorie `custom` est non supprimable.
- **Brouillon / programmation des packs officiels** : `Pack.isActive` (default `true`) + `Pack.publishAt: Date | null`. Filtre `publishedFilter()` appliqué sur `GET /packs`, `/packs/:id`, `/packs/share/:code` pour les **packs officiels uniquement** (les packs persos sont toujours visibles à leur auteur). Les gatés voient tout, y compris brouillons et programmés. `$ne: false` pour matcher aussi les packs créés avant l'ajout du champ (compatibilité ascendante).
- **Cosmétiques (shop)** : modèle `Cosmetic { slug, category, name, description, priceCents, stripeProductId, stripePriceId, asset, isActive, publishAt }`. Catégories : `roulette | needle | cochonnet | avatar-frame | badge | background | sound-pack | endgame-anim`. **Auto-création/sync Stripe** : à la création/édition d'un Cosmetic, le Product et le Price Stripe sont créés ou mis à jour automatiquement. Changement de prix = nouveau Price + désactivation de l'ancien (Stripe ne permet pas la modification). DELETE = soft-delete (set `isActive: false`) pour ne pas casser les utilisateurs qui possèdent déjà.
- **Achat cosmétique** : Stripe Checkout `mode: 'payment'` (one-shot, pas subscription) avec `metadata: { userId, cosmeticSlug, kind: 'cosmetic' }`. Le webhook `checkout.session.completed` détecte le `kind` et `$addToSet` le slug dans `User.purchasedSkins`.
- **Activation des cosmétiques** : `User.activeSkins` (Map `category → slug`). Route `PUT /api/users/me/active-skin` vérifie ownership avant d'activer. Un `slug: null` désactive (revient au default). Composants comme `Roulette` lisent `useActiveSkin('roulette')` pour résoudre le `Cosmetic` actif et appliquer son `asset.metals`.
- **Page Packs unifiée** : `/packs` a deux onglets `?tab=packs` (par défaut) et `?tab=cosmetics`. La boutique est intégrée dans la même page que la bibliothèque pour éviter une page séparée. L'ancienne route `/shop` redirige automatiquement vers `/packs?tab=cosmetics`. Stripe success URL pointe vers `/packs?tab=cosmetics&purchased=<slug>`.
- **Avatar premium** : composant `Avatar` cliquable uniquement si `hasPremiumAccess(user)` (donc Premium ou gate). Upload via `/media/upload` Cloudinary puis `PUT /users/:id`. Initiales en fallback pour les Free. Server-side, `PUT /users/:id` ne lit que `username` et `avatar` du body (whitelist stricte pour bloquer l'escalation `tier`/`role`), et `avatar` n'est accepté que si `req.user.isPremiumActive()`.
- **Annulation d'abonnement** : `User.subscription.cancelAtPeriodEnd` synchronisé depuis Stripe (`sub.cancel_at_period_end`). Affiche dans Profile une carte rouge clair avec date de fin + message marseillais ("C'est un sucre d'être Premium...").
- **Navigation arrière** : pattern unique `(location.key !== 'default' ? navigate(-1) : navigate('/'))` sur tous les boutons "← Retour" — déclenche le bon sens d'animation (POP) et garantit un fallback Home si on arrive par lien direct (galerie partagée, etc.). Pour les `navigate(..., { replace: true })` (cas Quitter salon où on veut éviter le back-loop vers le salon qu'on vient de quitter), passer `state: { dir: 'back' }` dans les options : `AnimatedRoutes` (App.jsx) lit ce flag et applique la direction = -1 (anim back) même quand navType === 'REPLACE'.
- **Préférences utilisateur** : store dédié `useSettingsStore` (`client/src/store/settingsStore.js`) pour `theme` + `soundEnabled`. Persistance directe via clés localStorage (`roulade-theme`, `roulade-sound`), pas de middleware persist Zustand (backwards-compat avec l'ancienne clé). `data-theme` appliqué sur `<html>` au module load → pas de flash. `gameStore` reste focalisé sur la state machine de gameplay, `sessionStore` sur la config de partie courante (playerNames, selectedPackId).
- **Composants UI partagés** : `<CosmeticCard layout="vertical|horizontal">` unifie la carte cosmétique entre PackLibrary boutique et Profile section "Mes cosmétiques". `<LoadingPlaceholder variant="card|list|text|tall">` skeletons shimmer GPU-friendly pour tous les fetches. `<EmptyState icon title description>` pour les états vides homogènes. `<RadarParisiens players history>` composant autonome qui apparaît automatiquement quand un joueur match (prénoms composés / bourgeois / particules / faible taux de réussite).
- **Hiérarchie des CTA** : règle stricte. `btn-gold` = action terminale jeu ou argent (Lancer, Rejouer, Tour suivant, Acheter, Payer, Débloquer). `btn-primary` = action secondaire (Sauvegarder, Modifier, Créer, Importer, Découvrir). `btn-ghost` = tertiaire (Annuler, Fermer, Retour léger). État `:disabled` géré globalement dans `global.css` (gris, `cursor: not-allowed`, no hover, no animation).
- **Modales** : pattern unique. Clic sur overlay ferme + bouton "Fermer/Annuler" visible + touche **ESC** ferme via hook `useEscapeClose(isOpen, onClose)` (`client/src/hooks/useEscapeClose.js`). Guards éventuels sur états in-flight (ex: `!deleting`).
- **Roulette GPU-friendly (compatibilité Safari iOS)** : interdiction des `feDropShadow` SVG et des `filter: drop-shadow` CSS sur les éléments tournants — WebKit ne peut pas les promouvoir en couche GPU et plante l'onglet sur iPhone. Les ombres utilisent `box-shadow` avec `border-radius: 50%`. Hints `will-change: transform`, `transform: translateZ(0)`, `backface-visibility: hidden` sur le disque. Les chiffres de la roulette utilisent un contour SVG léger (`stroke + paintOrder: stroke fill`) au lieu d'un filter pour simuler la gravure.
- **Layout pleine largeur** : Home, Game, History sortent du `max-width` du Layout pour utiliser tout le viewport (`.layout-page.game-page { padding: 0; max-width: 100%; }` dans `Layout.css`). History utilise un grid `auto-fill, minmax(280px, 1fr)` qui s'adapte automatiquement au nombre de colonnes selon l'écran. Le header de scores dans Game est séparé en `.game-scores-chips` (scroll horizontal pour les pseudos) + `.game-scores-actions` (sound + radar fixes à droite, jamais coupés sur mobile). **SalonGame mobile** : le padding-0 du `.game-page` est restauré sur les 4 côtés via `.salon-game-page` sous 1024px (avec safe-area-inset top/bottom/left/right) pour que les podiums/chips/invite respirent. **SalonGame endgame desktop** : le grid 2-col `height:100dvh; overflow:hidden` du `.game-page` est remplacé par `display:flex; min-height:100dvh; overflow:visible` via le modifier `.salon-game-page--endgame`, et `.game-scores` devient `position: sticky` pour rester visible au scroll de page.
- **Sécurité — rate limiting** : `express-rate-limit` configuré dans `app.js`. Global 300 req/min/IP (webhook Stripe exempté), login 10/15min, register 5/h, media upload 10/min, **salon join 5/min/IP** (anti-spam pour ne pas saturer un salon à 10 joueurs en quelques secondes). `app.set('trust proxy', 1)` pour que les IP X-Forwarded-For de Nginx soient correctement remontées. Sockets : throttle in-memory 250ms par socket sur `chat:emoji` pour bloquer le spam.

- **Audit sécurité pré-prod (patches appliqués)** :
  - **Cloudinary v1 → v2** (`^2.7.0`) : CVE HIGH GHSA-g4mf-96x5-5m2c (argument injection via `&`). API rétro-compatible pour `uploader.upload_stream`. `multer-storage-cloudinary` retiré (jamais utilisé, dépendait de v1).
  - **`ws` override `^8.20.1`** dans `overrides` server + client : patche la CVE moderate ws (uninitialized memory disclosure) sans bumper socket.io.
  - **`GET /api/users/:id`** : whitelist serveur. Si on regarde son propre profil → tout. Si on regarde un autre → projection `username avatar tier role createdAt stats` uniquement (pas d'email, pas de subscription, pas d'achats).
  - **`media:added` socket** : validate URL via `/^https:\/\/res\.cloudinary\.com\//` avant broadcast. Bloque l'injection de liens externes / phishing dans l'historique d'un salon.
  - **`register` validation stricte** : regex email, username 3-30 chars `[a-zA-Z0-9_-.]`, password 6-100 chars. Avant : aucune validation au-delà de "champs non vides".
  - **JWT_EXPIRES_IN** : default passé de `7d` à `1d` (override possible via .env). Token volé = exposition courte.
  - **morgan** : `combined` en prod (1 ligne par requête, parsable fail2ban/grafana), `dev` en dev (couleurs).
  - **CSP nginx** : header `Content-Security-Policy` ajouté sur les pages HTML : `default-src 'self'; script-src 'self' js.stripe.com; img-src 'self' data: res.cloudinary.com; connect-src 'self' wss: api.stripe.com; frame-src js.stripe.com hooks.stripe.com; object-src 'none'`. À tester soigneusement après déploiement (peut nécessiter des ajustements).
  - **Result audit** : `npm audit` returns **0 vulnerabilities** côté server et client.
- **Salons multi-joueurs temps réel (Phase 9)** :
  - **Socket.IO** server + client, une **room par salon** identifiée par `salon.code`.
  - **Création Premium-only** : `POST /api/salons` est gated `protect + requirePremium` (les gatés passent automatiquement via isPremiumActive()). Le créateur devient `host`. Les invités peuvent être logged-in (Free, Premium, gate) ou totalement anonymes (juste un pseudo).
  - **Identité** : chaque joueur reçoit un `connectionToken` (uuid) à la création/join, stocké en `localStorage` sous `arka-salon-<code>`. Sur reconnect, le client renvoie ce token, le serveur le matche et réintègre le joueur dans son slot (préservation pseudo + score). Le pseudo seul n'a pas valeur d'identité (anti-impersonation).
  - **Toast & son d'arrivée** : à chaque `salon:playerJoined`, tous les autres clients reçoivent le toast "Té, X vient d'arriver !" (5 phrases marseillaises tirées au sort) + chime synthétisé Web Audio (3 notes Do-Mi-Sol, sine).
  - **Sync feedback sensoriel** : au moment précis où la roulette démarre (à `startAt` calculé serveur), tous les phones vibrent 60ms ET jouent le son spin. Idem son stop quand le défi tombe, et validate/refuse au résultat. C'est ça qui crée le "carreau partagé" en soirée présentielle.
  - **Roulette synchronisée multi-device** : quand le current player appuie "TOURNER LA ROULETTE", le serveur broadcast `game:spinning` avec `{ targetIndex, seed, startAt: Date.now() + 500ms }`. Chaque client attend `startAt - Date.now()` puis lance l'animation déterministe — tous les phones démarrent à ~50ms près malgré la latence réseau. Les 500ms absorbent la jitter standard.
  - **Vote** : chaque joueur (sauf le current) vote `completed` ou `refused` depuis son phone après que le current player ait déclaré "j'ai fait". Majorité l'emporte. Si "je refuse" → résultat direct sans vote.
  - **Salon = groupe persistant** (depuis le pivot Mes salons) : un salon survit indéfiniment. Le host qui clique "Quitter" sort simplement, le salon reste ouvert et il pourra le retrouver dans **Mes salons** (`/salons`). Les autres joueurs ne sont PAS éjectés. Le host garde le rôle host pour toujours (lié à `hostUserId`). Idem pour les non-host : ils peuvent quitter et revenir sans perdre leur place.
  - **Destruction explicite** : nouvelle action `salon:destroy` (socket) + `DELETE /api/salons/:code` (REST). Host only. Passe le salon en `status='ended'`. L'historique reste consultable via `/salon/:code/history`. Plus aucune action de jeu possible.
  - **Pas de grace period kill** : le host (et n'importe qui) qui se déconnecte involontairement (WS dropped) passe juste offline. Le salon survit. Plus de countdown 60s, plus de killSalon automatique. Les events `salon:hostDisconnected` / `salon:hostReconnected` sont supprimés.
  - **Cleanup TTL 2h** : seul filet de sécurité qui auto-clos les salons vraiment abandonnés (lastActivityAt > 2h).
  - **Resume sans creds locaux** : route `POST /api/salons/:code/resume` (protect). Un user logged-in qui visite `/salon/:code` sans token en localStorage (autre device, cache vidé) déclenche un resume : le serveur retrouve son `connectionToken` via `players.userId === req.user._id` et réinjecte les creds. Anonyme sans creds → redirect `/salon/join`.
  - **Multi-partie par salon** : après la fin d'une partie, le host peut lancer une nouvelle partie dans le même salon (nouveau pack, nouveau tirage). Les scores sont remis à zéro mais l'historique complet (toutes les parties) reste dans le doc Mongo et s'affiche dans la page Historique.
  - **Max 10 joueurs** par salon. Visibilité **privée uniquement** (code 8 chars + QR vers `/salon/join/:shareLink`). Pas de listing public.
  - **Upload média dans un salon** : route dédiée `POST /api/salons/:code/media/upload` avec middleware `requireSalonMember` qui valide via `connectionToken`. Ouvert à tous les membres (le Premium du host "paye" pour le groupe). La route originale `POST /api/media/upload` (Premium-only) reste pour les usages hors salon (avatar, cover pack).
  - **Stats** : les parties jouées en salon comptent dans les `User.stats` des joueurs **connectés** uniquement. Les anonymes jouent sans incrément stats.
  - **State machine** : `Salon.status: 'lobby' | 'playing' | 'between-games' | 'ended'`. État détaillé du jeu courant dans `currentGame`, snapshots Mongo aux transitions importantes (game start, end, tour suivant) pour limiter la charge DB (pas d'écriture par vote individuel).
  - **Recovery** : au démarrage du serveur, les salons avec `status !== 'ended'` sont restaurés depuis Mongo dans l'état mémoire. Inactivité > 2h → cleanup auto vers `ended`.
- **Pièges CSS connus** : pas de classes globales avec des noms génériques (`.history-list` était partagé entre EndGame.css et History.css → conflit). Préfixer par le composant (`.endgame-history-list`).

---

## Modèles MongoDB

### User
```js
{
  username: String (unique),
  email: String (unique),
  password: String (hashé bcrypt, select: false),
  avatar: String (URL Cloudinary),               // upload Premium uniquement
  tier: 'free' | 'premium',
  role: 'user' | 'gate',                         // 'gate' = admin, promotion manuelle DB
  subscription: {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid' | 'incomplete' | 'incomplete_expired' | null,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: Boolean,                  // true si l'user a annulé mais l'abo court encore
  },
  purchasedPacks: [ObjectId → Pack],             // packs achetés individuellement (persistants)
  purchasedSkins: [String],                      // slugs de Cosmetic possédés (persistants)
  activeSkins: Map<String, String>,              // category → slug du cosmétique actif
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
  theme: String,                       // slug de Category (free string, validé contre Category côté route)
  isOfficial: Boolean,
  isPremium: Boolean,                  // contenu réservé aux Premium / acheteurs (uniquement sur les packs officiels)
  author: ObjectId → User,
  challenges: [ObjectId → Challenge],  // Free=8 exact, Premium=8 à 24 (validation serveur dans POST/PUT /packs)
  shareCode: String (nanoid 8),        // null pour les packs Free, généré pour les Premium
  coverImage: String (URL Cloudinary), // null pour les Free, optionnel pour les Premium
  isPublic: Boolean,
  isActive: Boolean,                   // brouillon ou non (officiels uniquement). default true
  publishAt: Date | null,              // programmation : caché côté public tant que la date n'est pas passée
  createdAt: Date
}
```

### Category
```js
{
  name: String,                        // ex: "Marseillais"
  slug: String (unique),               // ex: "marseillais" (auto-slugify si absent)
  icon: String,                        // nom d'icône du composant Icon (ex: "anchor")
  order: Number,                       // ordre d'affichage
  createdAt: Date
}
```

### Cosmetic
```js
{
  slug: String (unique),                                    // ex: "roulette-velodrome"
  category: 'roulette' | 'needle' | 'cochonnet'
         | 'avatar-frame' | 'badge' | 'background'
         | 'sound-pack' | 'endgame-anim',
  name: String,
  description: String,
  priceCents: Number,                                       // ex: 299 = 2,99 €
  stripeProductId: String,                                  // créé/sync auto
  stripePriceId: String,                                    // créé/sync auto, nouveau Price si prix change
  asset: Mixed,                                             // pour 'roulette' : { metals: [{hi,base,lo}×8] }
  isActive: Boolean,                                        // visible dans le shop. soft-delete via false
  publishAt: Date | null,
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
  createdBy: ObjectId → User (obligatoire — auth requise sur POST /sessions),
  shareLink: String (nanoid 10, unique),  // généré auto en pre-save
  createdAt: Date
}
```

### Salon (Phase 9 — multijoueur temps réel)
```js
{
  code: String (unique, nanoid 8),          // ex: 'ABCD1234' — code court à taper
  shareLink: String (unique, nanoid 10),    // URL longue pour QR (/salon/join/:shareLink)
  name: String,                              // ex: 'Le Salon des Sardines' (auto-généré si absent)
  hostUserId: ObjectId → User,               // créateur, Premium obligatoire
  players: [{
    playerId: String (uuid),
    pseudo: String,
    userId: ObjectId → User | null,         // null si anonyme
    score: Number,
    connectionToken: String (uuid),         // pour reconnect, stocké localStorage côté client
    isHost: Boolean,
    joinedAt: Date,
  }],
  status: 'lobby' | 'playing' | 'between-games' | 'ended',
  currentGame: {
    packId: ObjectId → Pack | null,
    currentPlayerIndex: Number,
    phase: 'idle' | 'spinning' | 'challenge' | 'vote' | 'result',
    spinSeed: Number,
    spinResult: Number,
    spinStartedAt: Date,                    // pour la sync multi-device
    currentChallenge: { text, intensity, ... } | null,
    votes: Map<playerId, 'completed' | 'refused'>,
    history: [{ playerName, challengeText, result, points, media, timestamp }],
  },
  games: [{                                 // historique des parties terminées dans ce salon
    packId,
    history,
    scores: [{ playerId, pseudo, score }],
    completedAt,
  }],
  createdAt: Date,
  lastActivityAt: Date,                     // pour TTL inactivité 2h
}
```

---

## Routes API

### Rate limiting (`express-rate-limit`)
- Global : 300 req/min/IP (skip `/api/payments/webhook` pour ne pas bloquer Stripe retries).
- `POST /api/auth/login` : 10 tentatives / 15 min / IP.
- `POST /api/auth/register` : 5 inscriptions / heure / IP.
- `POST /api/media/upload` : 10 uploads / min / IP.
- `app.set('trust proxy', 1)` actif pour reconnaître les vraies IP X-Forwarded-For via Nginx.

### Auth
```
POST   /api/auth/register
POST   /api/auth/login        # body: { login: "pseudo ou email", password }
POST   /api/auth/logout
GET    /api/auth/me
```

### Users
```
GET    /api/users/:id                    # (protect) — projection publique si pas owner (username avatar tier role createdAt stats)
PUT    /api/users/:id                    # (protect) — whitelist stricte { username, avatar }, avatar uniquement si isPremiumActive()
PUT    /api/users/me/active-skin         # body: { category, slug | null } - active/désactive cosmétique (protect, ownership)
GET    /api/users/:id/history            # (protect) — vérifie req.user._id === req.params.id (anti-IDOR)
```

### Packs
```
GET    /api/packs             # officiels (filtrés isActive + publishAt) + packs persos de l'user (flags accessible + isMine)
GET    /api/packs/me/count    # nombre de packs persos de l'user (protect, pour gater le free)
GET    /api/packs/:id         # pack complet OU teaser (1 défi) si pas d'accès. 404 si brouillon/programmé pour les non-gatés.
POST   /api/packs             # créer un pack perso (protect, validation Free/Premium)
PUT    /api/packs/:id         # éditer un pack perso (protect, ownership + validation tier)
DELETE /api/packs/:id         # supprime aussi les Challenge orphelins (protect, ownership)
GET    /api/packs/share/:shareCode   # même logique teaser/full selon accès
```

### Catégories
```
GET    /api/categories             # liste publique des catégories (pour Editor / PackLibrary / SessionSetup)
```

### Cosmétiques
```
GET    /api/cosmetics                       # shop public (optionalAuth → flag owned: bool par cosmetic)
POST   /api/cosmetics/:slug/checkout        # Stripe Checkout one-shot (protect)
```

### Espace Gaté (admin, requireGate)
```
GET    /api/gate/packs                # liste tous les packs officiels (y compris brouillons/programmés)
GET    /api/gate/packs/:id            # détail avec challenges
POST   /api/gate/packs                # créer un pack officiel
PUT    /api/gate/packs/:id            # éditer (avec replace des Challenge)
DELETE /api/gate/packs/:id            # supprime cascade Challenge

GET    /api/gate/categories           # CRUD catégories
POST   /api/gate/categories
PUT    /api/gate/categories/:id       # cascade rename slug → tous les packs concernés
DELETE /api/gate/categories/:id       # bloqué si utilisée (CATEGORY_IN_USE) ou si slug='custom'

GET    /api/gate/cosmetics            # CRUD cosmétiques + auto-sync Stripe Product/Price
POST   /api/gate/cosmetics
PUT    /api/gate/cosmetics/:id        # changement de prix → nouveau Stripe Price
DELETE /api/gate/cosmetics/:id        # soft-delete (isActive=false), Price/Product Stripe désactivés
```

### Sessions
```
POST   /api/sessions          # (protect) sauvegarder une partie terminée — createdBy = req.user._id
GET    /api/sessions/gallery/:shareLink   # galerie publique via shareLink
GET    /api/sessions/user/me              # (protect) historique de l'utilisateur connecté
```

### Médias
```
POST   /api/media/upload      # (protect + requirePremium) upload vers Cloudinary, 50 Mo max, photo ou vidéo
```

### Paiements (Stripe)
```
POST   /api/payments/create-checkout-session   # body: { billing: 'monthly' | 'annual' } (protect)
POST   /api/payments/portal                    # Billing Portal Stripe (protect)
GET    /api/payments/subscription              # statut courant (protect)
POST   /api/payments/webhook                   # signature Stripe + raw body
```

**Webhook events gérés** :
- `checkout.session.completed` :
  - `mode: 'subscription'` → active la subscription (tier='premium', sync currentPeriodEnd + cancelAtPeriodEnd)
  - `mode: 'payment'` + `metadata.kind === 'cosmetic'` → `$addToSet` du slug dans `User.purchasedSkins`
- `customer.subscription.updated` → sync status + currentPeriodEnd + cancelAtPeriodEnd
- `customer.subscription.deleted` → tier='free', status='canceled' (purchasedPacks et purchasedSkins préservés)
- `invoice.payment_failed` → status='past_due'

### Salons (Phase 9 — multijoueur temps réel)
**REST**
```
POST   /api/salons                              # (protect + requirePremium) crée un salon, retourne { code, shareLink, name, connectionToken }
GET    /api/salons/share/:shareLink             # infos publiques pour la page join (name, host, playerCount, status, hasOpenSlots)
POST   /api/salons/:code/join                   # body: { pseudo } — retourne { playerId, connectionToken, salonState }
POST   /api/salons/:code/resume                 # (protect) retourne creds (connectionToken) pour un user logged-in déjà membre du salon
POST   /api/salons/:code/media/upload           # (requireSalonMember via connectionToken) upload Cloudinary, attaché au tour courant
GET    /api/salons/me                           # (protect) TOUS les salons où je suis membre (players.userId === me), pas juste host. Retourne { isHost, gameCount, myLastSeenAt }
GET    /api/salons/:code/history                # (membre logged OU connectionToken OU host) — historique enrichi : games + stats par joueur + galerie media
DELETE /api/salons/:code                        # (protect, host only) destruction explicite → status='ended', historique préservé
```

**Socket.IO events** (room = `salon:<code>`)

Client → Server :
- `salon:join` `{ code, connectionToken }` — rejoint la room, restore l'identité
- `salon:leave` — quitte le salon (host ou non-host) : sort de la room, passe offline, le salon SURVIT
- `salon:destroy` — (host only) destruction explicite : status='ended', broadcast `salon:died`
- `salon:setName` `{ name }` (host only)
- `game:pickPack` `{ packId }` (host only)
- `game:spin` (current player only)
- `game:declareResult` `{ result: 'completed' | 'refused' }` (current player only)
- `game:vote` `{ vote: 'completed' | 'refused' }` (non-current player only)
- `game:nextTurn` (host only — peut être auto-déclenché après result)
- `game:endGame` (host only)
- `game:newRound` (host only — relance dans le même salon)
- `chat:emoji` `{ emoji }` — réaction live, broadcast à tous
- `media:uploaded` `{ url }` — broadcast après upload réussi via la route REST

Server → Client (broadcast room) :
- `salon:state` — état complet (envoyé après join/reconnect)
- `salon:playerJoined` / `salon:playerLeft` (avec flag `disconnected: bool`) / `salon:playerReconnected`
- `salon:died` `{ reason }` — destruction explicite host, passage en read-only
- `game:packPicked` `{ pack }`
- `game:spinning` `{ targetIndex, seed, startAt }` — déclenche la roulette synchro sur tous les phones
- `game:challenge` `{ challenge, currentPlayer }`
- `game:voteOpened` (après declareResult='completed')
- `game:result` `{ result, points, votes, scores }`
- `game:nextTurn` `{ currentPlayerIndex }`
- `game:ended` `{ finalScores, history }`
- `chat:emoji` `{ emoji, fromPlayerId, fromPseudo }`
- `media:added` `{ url, playerId, pseudo }`

### SEO (hors `/api`)
```
GET    /sitemap.xml                   # dynamique : pages fixes + galleries publiques + packs avec shareCode. Cache 1h.
GET    /robots.txt                    # statique dans client/public, Allow public + Disallow espaces privés
```

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
- [x] Avatar uploadable Premium (clic sur l'avatar → file picker → Cloudinary → PUT user)
- [x] `User.subscription.cancelAtPeriodEnd` synchronisé depuis Stripe
- [x] Profile : carte rouge + message marseillais quand l'user a annulé son abonnement (date de fin + ref "sucre / monstre / poulet")

### Phase 6.6 — Espace Gaté & Catégories dynamiques ✅
- [x] `User.role: 'user' | 'gate'` + middleware `requireGate` (403 `GATE_REQUIRED` sinon)
- [x] `ProtectedRoute` accepte `gateOnly` qui redirige `/` si pas gaté
- [x] Page `/gate/packs` : CRUD complet des packs officiels avec section repliable "Catégories"
- [x] Page `/gate/cosmetics` : CRUD cosmétiques avec éditeur de palette 8×3 inputs color HTML5 + preview live
- [x] Lien "Espace Gaté" dans Profile visible uniquement si `user.role === 'gate'`
- [x] Modèle `Category` (slug auto-generate, icon, order) + routes `GET /categories` (public) et `/gate/categories` (CRUD)
- [x] `Pack.theme` : enum hardcodé retiré, devient string libre validé contre `Category.slug`
- [x] Cascade rename : changement de slug d'une catégorie met à jour tous les packs concernés
- [x] `Pack.isActive` (default `true`) + `Pack.publishAt: Date | null` pour brouillons et programmation
- [x] Filtre `publishedFilter()` server-side : packs officiels brouillons/programmés invisibles côté joueurs (mais visibles aux gatés)
- [x] Hook client `useCategories` avec cache module-level + `invalidateCategories()`
- [x] Editor + PackLibrary + PackSelection : fetch dynamique des catégories au lieu d'enum hardcodé
- [x] Script `server/scripts/seed-categories.js` (6 catégories par défaut)

### Phase 6.7 — Boutique de cosmétiques ✅
- [x] Modèle `Cosmetic` avec `category`, `priceCents`, `stripeProductId`, `stripePriceId`, `asset`, `isActive`, `publishAt`
- [x] `User.activeSkins: Map<category, slug>` (un skin actif par catégorie)
- [x] Routes `/api/cosmetics` (publique avec flag `owned`) + `/api/cosmetics/:slug/checkout` (Stripe payment one-shot)
- [x] Auto-création/sync Stripe Product+Price depuis l'Espace Gaté (changement de prix = nouveau Price + désactivation de l'ancien)
- [x] Webhook étendu : `checkout.session.completed` mode `payment` + `kind=cosmetic` → `$addToSet purchasedSkins`
- [x] Route `PUT /api/users/me/active-skin` (vérifie ownership)
- [x] Hook client `useActiveSkin(category)` avec cache module-level
- [x] `Roulette.jsx` accepte un prop `palette` dynamique (fallback sur `DEFAULT_METALS` pétanque)
- [x] Composant `RoulettePreview` (mini-roulette statique sans animation) pour le shop et le profil
- [x] Page Packs unifiée : 2 onglets `?tab=packs` / `?tab=cosmetics` (la boutique est intégrée à la page des packs, pas une page séparée)
- [x] Profile : section "Mes cosmétiques" avec preview et toggle "Activer"
- [x] Espace Gaté `/gate/cosmetics` : éditeur visuel de palette 8 tranches × 3 teintes
- [x] Script `server/scripts/seed-cosmetics.js` : 3 skins de roulette (Vélodrome, Calanques, Bouillabaisse) à 2,99 €

### Phase 6.8 — Polish UX, refactos & sécurité (post-V1 live) ✅
**UX & simplifications**
- [x] Fusion **puis re-séparation** de SessionSetup/PackSelection : version finale = wizard 2 étapes dans un seul composant (joueurs → pack), indicateur de progression, transitions slide, skip étape 2 si `preselectedPackId`. Route `/session/pack` supprimée (redirige vers `/session/setup`), composant `PackSelection.jsx` supprimé.
- [x] Tri "Mes packs" en tête de la grille à l'étape 2.
- [x] Page Profile allégée : raccourcis en grille 3 tuiles compactes (Historique / Packs / Créer un pack), liens gatés en 2 pills, suppression des doublons CTA (boutique).
- [x] Filtres thématiques retirés de PackLibrary (bruit avec <30 packs).
- [x] Header de scores Game refactoré pour iPhone SE : `.game-scores-chips` (scroll horizontal) + `.game-scores-actions` (sound/radar fixes).
- [x] Audit mobile Editor : `.editor-challenge-header` wrap, picker d'intensité en propre ligne sur ≤480px.
- [x] Hiérarchie CTA stricte appliquée partout (gold = jeu/argent, primary/ghost ailleurs) + état `:disabled` global désaturé.
- [x] Composants partagés : `<CosmeticCard layout="vertical|horizontal">`, `<LoadingPlaceholder>`, `<EmptyState>`, `<RadarParisiens>`.
- [x] Hook `useEscapeClose` branché sur toutes les modales (PaywallModal, RadarParisiens, share/delete packs, gate modals, Gallery lightbox).
- [x] Pattern `navigate(-1)` standardisé avec fallback `navigate('/')` (Gallery, History, Editor).
- [x] Upsell discret "photo Premium" en EndGame pour les Free (en remplacement de `<MediaUpload>`).

**Refactos**
- [x] `useSettingsStore` créé (`theme` + `soundEnabled`) — extraction depuis `sessionStore`/`gameStore` qui mélangeaient préférences user et état de partie. Persistance directe localStorage, backwards-compat sur l'ancienne clé `roulade-theme`.
- [x] `RadarParisiens` extrait en composant autonome, déclenchement automatique : il pop quand au moins 1 joueur match (prénoms composés type "Jean-Édouard", prénoms bourgeois "Charles/Côme/Capucine", particule "de/du/de la", OU taux de réussite < 25% sur ≥4 défis). Modale liste les suspects avec leurs raisons en argot marseillais ("Prénom à rallonge", "Sent le 16ème", "Encore un plus de 10", "Plus mou qu'une panisse").
- [x] Bug fix `User.toJSON` : `flattenMaps: true` ajouté pour que la Map `activeSkins` sérialise correctement en JSON (sinon vide côté client).
- [x] `HomeRoulette` consomme le skin actif via `useActiveSkin('roulette')`.

**Sécurité (audit complet + fixes)**
- [x] **P0 escalation de privilèges** — `PUT /api/users/:id` whitelistait pas les champs → un user pouvait s'auto-promouvoir Premium/gate. Whitelist stricte `{ username, avatar }`, `avatar` réservé Premium.
- [x] **MediaUpload Premium-only** : `POST /api/media/upload` passe en `protect + requirePremium`. Côté client, le composant `<MediaUpload>` n'est rendu que pour les Premium.
- [x] **Sauvegarde session : auth obligatoire** — `POST /api/sessions` passe en `protect`. Plus de decode JWT manuel, `createdBy = req.user._id`.
- [x] **IDOR fix** sur `GET /api/users/:id/history` : check ownership `req.user._id === req.params.id` → 403 sinon.
- [x] **Routes mortes supprimées** : `GET /api/sessions/:id` (public), `PUT /api/sessions/:id` (mass assignment + IDOR), `DELETE /api/media/:publicId` (IDOR Cloudinary). Jamais appelées par le client.
- [x] **Rate limiting** : `express-rate-limit` installé (global 300/min, login 10/15min, register 5/h, upload 10/min). `trust proxy` activé pour Nginx.
- [x] `console.log('Cloudinary config:', ...)` retiré du flow d'upload.

**Compatibilité Safari iOS (crash roulette)**
- [x] Filtres SVG `feDropShadow` supprimés des deux roulettes (Roulette + HomeRoulette) — empêchaient la composition GPU sur WebKit, plantaient l'onglet iOS.
- [x] Remplacement des `filter: drop-shadow` CSS par `box-shadow` sur les disques rotatifs (compatible GPU avec `border-radius: 50%`).
- [x] Hints GPU : `will-change: transform`, `transform: translateZ(0)`, `backface-visibility: hidden` sur les éléments animés.
- [x] Contour SVG léger (`stroke` + `paintOrder: stroke fill`) sur les chiffres pour conserver l'effet "gravure" sans coût GPU.

### Phase 7 — Déploiement OVH ✅
- [x] `client/Dockerfile` (multi-stage Vite build + Nginx alpine)
- [x] `server/Dockerfile` (Node 22 alpine, `npm ci --omit=dev`)
- [x] `docker-compose.prod.yml` (server + client + certbot, réseau bridge isolé)
- [x] `client/nginx.conf` (reverse proxy `/api`, gzip, security headers, SSL, SPA fallback, cache assets)
- [x] Certbot avec renouvellement auto (boucle 12h, `--deploy-hook` qui SIGHUP nginx)
- [x] `.env.production.example` template
- [x] `scripts/init-ssl.sh` (génération initiale SSL Let's Encrypt)
- [x] `scripts/deploy.sh` (git pull + rebuild + restart)
- [x] `scripts/setup-vps.md` (doc complète : install Mongo apt, UFW, users Mongo, backups cron, premier déploiement, Stripe live)
- [x] **Architecture** : Mongo en service systemd sur le host Debian (bind 127.0.0.1 + 172.17.0.1), conteneurs accèdent via `host.docker.internal:host-gateway`. UFW protège tout sauf 22/80/443. Template OVH "Debian 12 - Docker" → Docker préinstallé.
- [x] Domaine cible : **arka.michaelrichaud.fr**
- [x] Setup réel sur le VPS OVH (sections 1-7 du setup-vps.md exécutées)
- [x] Premier déploiement live + génération SSL Let's Encrypt
- [x] Création du compte gaté en prod
- [ ] Stripe en mode live + webhook prod configuré (cf. section "Stripe LIVE" dans TODOs)

### Phase 8 — SEO & Référencement 🚧
**Stratégie** : viser le long-tail à faible concurrence ("jeu de défis marseillais", "roulette de défis entre amis", "jeu apéro marseille") + nom de marque ("La Roulade Marseillaise", "ARKA roulade"). Cibler **"roulette"** ou **"roulade"** seuls n'est pas réaliste (concurrence casinos / cuisine).

**Phase 8.1 technique livrée** — il reste l'OG image 1200x630 dédiée à créer et la soumission aux Webmaster Tools (post-déploiement). **Phase 8.2 contenu/backlinks** reste à attaquer.

**Phase 8.1 — SEO technique** ✅
- [x] `react-helmet-async` installé + `HelmetProvider` wrap dans `main.jsx`.
- [x] Composant `<SEO>` centralisé (`client/src/components/SEO/SEO.jsx`) : title (suffixé automatiquement par "· La Roulade Marseillaise"), description, canonical, Open Graph, Twitter Cards, JSON-LD optionnel, prop `noindex` pour les pages privées.
- [x] Meta + OG sur les routes publiques : **Home** (description marketing + JSON-LD WebApplication), **Premium** (pricing teaser), **Packs / Boutique** (catalogue), **Gallery** (`ogType: 'article'`, image = premier média de la galerie, title dynamique avec les joueurs).
- [x] Section "À propos / règles du jeu" sur la Home avec ~400 mots indexables : 4 sous-sections H2/H3 (jeu, modes, packs, pourquoi marseillais, comment commencer). Visible en scrollant sous la roulette. Mobile + desktop responsive.
- [x] `client/public/robots.txt` : Allow all + Disallow espaces privés (`/login`, `/profile`, `/history`, `/editor`, `/gate/`, `/salon/`, `/salons`). Référence `Sitemap: https://arka.michaelrichaud.fr/sitemap.xml`.
- [x] Sitemap dynamique server-side : `server/src/routes/sitemap.js` génère `/sitemap.xml` avec pages fixes + galleries publiques (max 500, sorted by createdAt desc) + packs partageables (shareCode != null). Cache 1h.
- [x] Nginx `location = /sitemap.xml` proxy vers le backend, robots.txt servi statiquement depuis `/usr/share/nginx/html`.
- [x] Canonical URLs : auto via `<link rel="canonical">` dans `<SEO>`, basée sur le `path` passé en prop.
- [x] JSON-LD `WebApplication` sur la Home avec `applicationCategory: GameApplication`, offers gratuit, creator ARKA.
- [ ] Image OG 1200x630 dédiée à créer (fallback actuel : `pwa-512x512.png`, carrée — coupée en bandeau sur certaines plateformes).
- [ ] Vérification Search Console + Bing Webmaster (post-déploiement)

**Phase 8.2 — Contenu & backlinks (continu, plusieurs mois)**
- [ ] Blog / page "Inspirations soirées" avec du contenu marseillais
- [ ] Galeries publiques bien titrées (chaque galerie = page indexable, fort potentiel de partage)
- [ ] Backlinks : Product Hunt, sites de jeux d'apéro, blogs marseillais, presse régionale (La Provence, Made In Marseille)
- [ ] Présence Insta / TikTok avec lien retour
- [ ] Reviews ou citation par influenceurs marseillais

### Phase 9 — Salons multijoueurs temps réel ✅
**Vision** : permettre à un Premium de créer un "Salon" privé invitable par QR/code. Chaque joueur sur son propre téléphone. Roulette synchronisée multi-device. Le salon survit plusieurs parties (une soirée = un salon). Max 10 joueurs.

**Règles de gating** :
- Création : Premium uniquement.
- Rejoindre : tout le monde (logged Free/Premium ou anonyme avec pseudo).
- Upload média : ouvert à tous les membres du salon (bypass `requirePremium` via `requireSalonMember`).
- Stats : comptent pour les joueurs connectés uniquement.
- Stop de la partie / changement de pack / nouveau round : host uniquement.

**Décisions de design** :
- Host quitte volontairement → salon meurt instantanément.
- Host se déconnecte involontairement → grace period 60s avec countdown UI côté autres. Si retour avant 60s → reprise. Sinon → mort.
- Salon mort = read-only : historique et photos restent consultables, plus d'actions.
- Visibilité 100% privée (code 8 chars + QR), pas de listing public.
- Roulette synchro via `{ targetIndex, seed, startAt }` (startAt = Date.now() + 500ms côté server, chaque client attend).
- Reconnect : `connectionToken` stocké en `localStorage` sous `arka-salon-<code>`.

**Sprint 1 — Backend foundation (3-4j)** ✅
- [x] Modèle Mongo `Salon` avec state machine (`lobby | playing | between-games | ended`)
- [x] Routes REST : `POST /api/salons` (Premium), `POST /api/salons/:code/join`, `GET /api/salons/share/:shareLink`, `GET /api/salons/me`, `GET /api/salons/:code/history`
- [x] Setup Socket.IO server + intégration dans `server.js` (httpServer wrap), room par salon
- [x] Auth socket : JWT pour connectés, `connectionToken` pour anonymes
- [x] State machine en mémoire (`Map<code, SalonState>`) + snapshots Mongo aux transitions importantes
- [x] Middleware `requireSalonMember` pour la route upload média dédiée
- [x] Recovery au boot serveur : restore des salons `status !== 'ended'` (audit log + reconstruction naturelle via `salon:join`)
- [x] Cleanup auto : `lastActivityAt` > 2h → `status = 'ended'` (tick toutes les 5 min)
- [x] Nginx : location `/api/socket.io/` avec upgrade WS et timeouts longs
- [x] Vite proxy : `ws: true` sur `/api` pour que le WS s'upgrade en dev

**Sprint 2 — Frontend lobby & join (2-3j)** ✅
- [x] Pages `/salon/new` (création Premium-only), `/salon/:code` (lobby + jeu auto-détecté), `/salon/join` (code manuel), `/salon/join/:shareLink` (QR)
- [x] Client Socket.IO + hook `useSalonSocket(code, connectionToken)` qui gère connect/reconnect/hydratation
- [x] Lobby UI : liste joueurs avec arrivées animées, pseudo + avatar, bouton "Quitter" (avec confirmation si host)
- [x] QR code via `qrcode.react`, partage natif Web Share API (fallback copie du lien)
- [x] Gating Premium sur `/salon/new` (redirect `/premium` si Free)
- [x] Overlay countdown 60s côté joueurs quand le host se déconnecte involontairement
- [x] Reprise auto si on arrive via shareLink alors qu'on a déjà des creds locaux pour ce salon
- [x] Persistance creds en localStorage (clé `arka-salon-<code>`)
- [x] Home : CTA "Créer un salon" (Premium) + "Rejoindre un salon" (universel)

**Sprint 3 — Gameplay synchronisé (3-4j)** ✅
- [x] Pick pack par host (modale inline dans le lobby, fetch `/api/packs` filtré sur `accessible`) + broadcast `game:packPicked`
- [x] Spin synchro : current player tape "TOURNER" → server génère `{ targetIndex, seed, startAt }` → broadcast → toutes les roulettes lancent en sync (chaque client attend `startAt - Date.now()` puis `setLocalSpinning(true)`)
- [x] Phase challenge : current player voit le défi + timer + boutons "J'ai fait" / "Refuser" / "C'est pas ma faute". Autres voient "X est en train de relever le défi…"
- [x] Vote panel multi-device : si current déclare "j'ai fait" → autres joueurs voient 2 boutons ✓ / ✗ (un seul vote par joueur). Majorité l'emporte. Progress broadcast `game:voteProgress`. Résultat final `game:result`.
- [x] Phase result : tous voient le score mis à jour. Host peut "Tour suivant" ou "Terminer". Current player peut aussi "Tour suivant".
- [x] Transitions de tour (`game:nextTurn`), fin de partie (`game:endGame` → archive + stats users connectés), nouveau round (`game:newRound`) qui repasse en lobby pour re-pick un pack.
- [x] Snapshot dénormalisé du pack dans `salon.currentGame.pack` (8 challenges tirés au sort) — survit à une modif/suppression du pack pendant la partie.
- [x] Réactions emojis live (`chat:emoji`) qui flottent à l'écran sur tous les phones.
- [x] Bypass cache service worker sur `/api/socket.io/*` (vite-plugin-pwa) pour ne pas intercepter polling/WS en prod.
- [x] Server gère phase transition `spinning → challenge` via `setTimeout(SPIN_LEAD + SPIN_ANIM)` après broadcast `game:spinning`. La transition Mongo est gated sur `spinSeed` pour éviter les conflits si plusieurs spins se chevauchent.

**Sprint 4 — Immersion (3-4j)** ✅
- [x] `navigator.vibrate(200)` quand c'est à toi (current player phone seulement) — entrée en `idle` = buzz simple, entrée en `challenge` = pattern court 80-60-80 (heads up !)
- [x] Réactions emoji live : tap d'un emoji broadcast `chat:emoji`, tous voient l'emoji flotter à l'écran. UI refactorée en **FAB repliable** (bouton 🐟 bas-droite, "sardine") qui dévoile une row d'emojis en popover.
- [x] Son chime de bienvenue synthétisé (`'arrive'` dans `useSound.js`) : 3 notes Do-Mi-Sol en sine wave, ~300ms, déclenché sur `salon:playerJoined` côté tous les clients sauf le nouvel arrivant.
- [x] Vibration + sons synchrones au spin : à `startAt`, tous les phones vibrent 60ms ET jouent `play('spin')`. À l'arrivée en `challenge`, tous jouent `play('stop')`. Au résultat, tous jouent `validate` (✓) ou `refuse` (✗). C'est la synchro physique qui rend les soirées en présentiel marrantes.
- [x] Générateur de nom de salon marseillais aléatoire (`SALON_NAMES` dans `routes/salons.js`, 10 noms)
- [x] Badge "EN DIRECT" discret en haut de SalonGame avec compteur joueurs en ligne (`onlinePlayerIds.length / total`)
- [x] Animation arrivée joueur en lobby (AnimatePresence avec slide horizontal sur `lobby-player-row`)
- [x] Toast "Té, X vient d'arriver !" pendant la partie — composant `SalonToast` autonome, position fixed top-center, slide-in spring, auto-dismiss 3.2s, 5 phrases marseillaises tirées au sort de façon stable par playerId, emoji 👋 qui salue. Rendu dans SalonLobby et à côté de SalonGame.
- [ ] Replay des moments forts post-partie (réutilise photos uploadées en mode stories Insta) — *skip pour V1, accès via la page Historique salon (onglet Galerie) suffit*

**Pass marseillais sur les pages Salon** (post-Sprint 4) :
- Vocabulaire unifié : "gatés" (joueurs), "patron" (host), "carreau" (en jeu), "à l'apéro" (lobby), "pause pastis" (between-games), "au cagnard" (fermé), "bouillabaisse" (endgame), "casser le salon" (vs "détruire"), "y retourner" (reprendre), "souvenirs → galerie" pour le tab photos, "l'historique" pour la vue détaillée.
- Empty states colorées : "Pas un seul salon, hé bé !", "Pas une seule partie, oh fada !", "Galerie vide, hé bé !".
- Status pills, libellés CTA et messages d'erreur tous repassés en ton marseillais.

**Bug fixes UX post test multi-device** :
- [x] Barre emoji `position: fixed; bottom` chevauchait le bouton "Tour suivant" → remplacée par FAB repliable.
- [x] Label "REFUSÉ" passé d'un h2 imposant à une pill rouge (1.4rem, padding 6/18px) pour cohérence avec "+X pts".
- [x] Écran fin de partie (`.salon-endgame`) cassait le grid 2-col desktop (vide à droite) → en endgame, modifier `.salon-game-page--endgame` qui passe en `display: flex` + `min-height: 100dvh` + `overflow: visible`, scroll naturel de page. Score chips deviennent `position: sticky`.
- [x] PlayerCard avec `isActive={p.playerId === myPlayerId}` dans l'endgame → "À toi de jouer !" contextuellement faux (partie terminée). Retrait du flag en endgame, on garde uniquement les ranks 1/2/3 + un dot online/offline overlay sur chaque card.
- [x] Mobile : `.layout-page.game-page` mettait `padding: 0` (utile pour la roulette plein écran) ce qui faisait coller tous les éléments du SalonGame aux 4 bords. Restauration du padding sur `.salon-game-page` mobile uniquement, sur les 4 côtés (avec safe-area-inset).
- [x] Message spectateur "X va tourner la roulette…" était collé bas-gauche en `inline-flex` → passé en `display: flex; justify-content: center; width: 100%` + modifier `.game-idle--spectator` qui centre verticalement dans la zone disponible.
- [x] Animation Quitter partait du mauvais côté → `App.jsx` lit `location.state.dir === 'back'` pour traiter le REPLACE comme un POP (anim back). Combiné avec navigate(-1) en priorité (fallback `replace` uniquement si pas d'historique) pour éviter l'accumulation d'entries `/salons` dans l'historique.
- [x] FAB emoji `😄` → `🐟` (sardine, icône de Marseille).
- [x] Endgame mobile : titre `clamp(1.6rem, 7.5vw, 2.4rem)` pour éviter overflow. Bloc invite (QR + code + Copier/Filer) ajouté entre podium et actions pour pouvoir inviter d'autres gatés entre 2 parties.
- [x] Padding top mobile salon : `max(28px, env(safe-area-inset-top) + 16px)` (vs 12px avant) pour décoller les score chips du status bar / encoche.

**Sprint 5 — Robustesse (2-3j)** ✅
- [x] Reconnect token : flux complet `localStorage` → emit `salon:join` avec token → réintégration du slot (fonctionnel via `useSalonSocket` + reconnection auto socket.io-client).
- [x] Cleanup salon mort : status `ended`, route history reste accessible.
- [x] Error states : salon full / ended / code invalide / pseudo pris → page SalonJoin lit `err.response?.data?.message` direct du serveur. Connect errors socket → page SalonLobby loading affiche le message marseillaisé selon le code.
- [x] Recovery Mongo au restart serveur : implicite via reconnection auto des clients (`lifecycle.recoverActiveSalons()` audit-log au boot, et les `salon:join` des clients reconstruisent l'état mémoire).
- [x] iOS background reconnect : `useSalonSocket` ajoute un listener `document.visibilitychange` qui force `socket.connect()` au retour foreground si déconnecté. Évite d'attendre le timeout ping/pong (~45s) par défaut.
- [x] Toast d'erreur global sur emit échoué : `emit()` wrapper dans `useSalonSocket` détecte `ack.ok === false` et appelle `pushErrorToast()` avec un message marseillaisé via map `ERROR_MESSAGES` (HOST_ONLY, NOT_YOUR_TURN, BAD_PHASE, etc.). Option `{ silent: true }` pour les actions où l'erreur est gérée inline (pack picker, leave, destroy).
- [x] `SalonToast` étendu pour gérer 2 types : join toast (pill blanche, animation 👋) et error toast (pill rouge, cliquable pour fermer). Anchor flex column pour empiler.
- [ ] Vibration permissions Android : pas d'action nécessaire — la vibration déclenchée par action user (spin) est déjà OK. À tester en réel si jamais.

**Total estimé** : 14-18 jours focused. Sprint 1→4 livrés.

---

## Mes salons & persistance (pivot post-Phase 9 Sprint 3)

Le modèle "salon = soirée éphémère qui meurt si le host part" a été remplacé par "salon = groupe persistant qui accumule des soirées". Changements clés :

- **Host quitte n'a plus de conséquence** : `salon:leave` ne tue plus le salon, et `disconnect` n'a plus de grace period qui pouvait kill. Le host peut revenir via Mes salons.
- **Action explicite `salon:destroy`** + `DELETE /api/salons/:code` (host only) pour vraiment fermer un salon. L'historique reste accessible via `/salon/:code/history`.
- **Page Mes salons (`/salons`)** : grille des salons où l'user est membre (filtre `players.userId === me`), groupés "Encore chauds" (status ≠ ended) et "Aux oubliettes" (ended). Action bar top : Ouvrir un nouveau salon (Premium-or-gate) + Rejoindre avec un code. Chaque card : Y retourner / L'historique / 🗙 Casser (host).
- **Page Historique (`/salon/:code/history`)** : 3 onglets — **Les parties** (cards avec gagnant, drill-down chronologique défi par défi), **Le tableau** (stats agrégées par joueur : parties, défis ✓/✗, points, taux de forme), **Galerie** (grid photos avec lightbox).
- **Route resume `POST /api/salons/:code/resume`** (protect) : un user logged-in qui visite `/salon/:code` sans creds localStorage (cas autre device, cache vidé) → le serveur retrouve son `connectionToken` via `players.userId` et réinjecte. Anonyme sans creds → redirect `/salon/join`.
- **playerSchema.lastSeenAt** : timestamp mis à jour à chaque `salon:join` et `disconnect`. Utile pour tri "dernière activité" et pour les anciens joueurs qui reviennent.
- **`GET /api/salons/me`** retourne maintenant TOUS les salons où je suis membre (pas juste host), avec `isHost`, `gameCount`, `myLastSeenAt`.

## Owner / Dashboard admin

- Rôle **owner** = propriétaire de l'instance (un seul, pas plusieurs comme gate). Match par email vs `process.env.OWNER_EMAIL` (lowercase). Pas de role en DB, juste une env var → pas de migration de schema.
- Middleware `requireOwner` dans `middlewares/auth.js` : 401 si pas connecté, 403 `OWNER_REQUIRED` si pas l'owner.
- Méthode `User.methods.isOwner()` + exposition `isOwner: bool` dans `User.toJSON()` → le client conditionne l'affichage du lien Admin via `user.isOwner`.
- Route `GET /api/admin/stats` (protect + requireOwner) : retourne `{ users (par tier + signups 7d/30d), subscriptions (active/canceled/pastDue/cancelAtEnd + MRR estimé), packs (officiels/custom/total), sessions (locales + médias), salons (par status + games joués cumulés + activeRooms list), live (socketsConnected + salonsWithPlayers) }`.
- Page client `/admin` (`pages/Admin/Dashboard.jsx`) : polling 5s du endpoint, pill "EN DIRECT" qui pulse, bouton Pause/Reprendre, libellés marseillais ("Le café du commerce", "Pause pastis", "Sur le carreau", "Au cagnard"). Cards animées au changement de valeur (Framer Motion).
- Lien d'accès dans `/profile` : pill rouge "Le café du commerce (admin)" visible UNIQUEMENT si `user.isOwner` (à côté des pills gatées).
- Env `OWNER_EMAIL` à set dans `.env.production` (sinon le dashboard est désactivé pour tout le monde).
- Sockets stats récupérées en mémoire via l'export `activeSockets` Map de `sockets/index.js` (pas de round-trip Mongo pour le live count).

## Gate = Premium effectif

- `User.isPremiumActive()` retourne `true` automatiquement si `role === 'gate'`. Effet domino : **tous** les checks Premium côté serveur (requirePremium middleware, pack creation, salon creation, media upload, avatar upload) acceptent les gatés sans qu'ils aient à payer.
- Côté client, helper `hasPremiumAccess(user)` dans `client/src/utils/permissions.js` qui = `tier === 'premium' || role === 'gate'`. Utilisé dans Home, MesSalons, SalonNew, Game, Editor à la place de `tier === 'premium'`.
- Profile reste sur `sub?.isPremiumActive || tier === 'premium'` qui marche pour les gatés parce que le serveur renvoie `isPremiumActive: true`.

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

---

## Reste à faire / TODOs

Items en attente, par domaine. À cocher au fur et à mesure.

### Redéploiements (Phase 7 ✅ déjà en prod)

Pour chaque nouveau push de fonctionnalité ou patch :

```bash
# Depuis le mac
git push origin main

# Sur le VPS (en SSH debian@arka.michaelrichaud.fr)
cd /opt/roulade
./scripts/deploy.sh
```

Le script `deploy.sh` fait pull + rebuild images + restart + cleanup. Renouvellement SSL Let's Encrypt automatique via le conteneur certbot (boucle 12h).

Cas particuliers :
- **Nouveaux scripts dans `server/scripts/`** (seeds, migrations) : rebuild force du conteneur server avant `docker exec ... node scripts/X.js`.
- **Changements `.env.production`** : éditer sur le VPS avec `nano /opt/roulade/.env.production` puis `docker compose -f docker-compose.prod.yml up -d server` pour recharger.
- **Changement Mongoose schema** : pas de migration auto. Les anciens docs gardent leurs anciens champs, les nouveaux champs ont leur default. Pour cleanup, scripter via `mongosh`.
- **Changement nginx.conf** : rebuild image client (pas de hot reload nginx en prod).

### Phase 8 — SEO (suite après déploiement)
- [ ] **Créer une OG image dédiée 1200x630** (preview WhatsApp/iMessage/Insta parfaite). Pour l'instant fallback `pwa-512x512.png` (carré, coupé en bandeau). Une fois créée, la mettre dans `client/public/og-image.png` et update `DEFAULT_OG_IMAGE` + remettre `og:image:width/height` dans `<SEO>`.
- [ ] **Soumettre le sitemap dans Google Search Console** (https://search.google.com/search-console) : ajouter la propriété `arka.michaelrichaud.fr`, vérifier via meta tag ou DNS, soumettre `https://arka.michaelrichaud.fr/sitemap.xml`.
- [ ] **Bing Webmaster Tools** (https://www.bing.com/webmasters) : même flow.
- [ ] **Tester les previews** via [opengraph.xyz](https://www.opengraph.xyz/) après déploiement. Vérifier que les meta sont bien rendues (helmet-async écrit dans le DOM après hydratation, mais Google et la plupart des crawlers rendent le JS aujourd'hui).
- [ ] **Phase 8.2 — Contenu & backlinks** (continu sur plusieurs mois) : blog/page "Inspirations soirées", backlinks Product Hunt + sites jeux d'apéro + blogs marseillais + presse régionale (La Provence, Made In Marseille), présence Insta/TikTok, reviews influenceurs marseillais.

### Stripe LIVE (quand prêt à monétiser)
- [ ] Dans dashboard Stripe **mode Live** : créer 2 produits Premium Mensuel + Annuel avec leurs Prices, copier les IDs.
- [ ] Récupérer `sk_live_...` + créer un nouvel endpoint webhook live, copier le `whsec_live_...`.
- [ ] Update `.env.production` sur le VPS : `STRIPE_SECRET_KEY=sk_live_xxx`, `STRIPE_WEBHOOK_SECRET=whsec_live_xxx`, `STRIPE_PRICE_MONTHLY=price_xxx`, `STRIPE_PRICE_ANNUAL=price_xxx`.
- [ ] Relancer le `seed-cosmetics.js` pour créer les Stripe Products/Prices côté **Live** (les Test seront orphelins, à archiver à la main).
- [ ] Restart server : `docker compose -f docker-compose.prod.yml up -d server`.
- [ ] Faire un vrai paiement test (carte perso, on rembourse après) pour valider le flow end-to-end.

### Polish / features bonus identifiées mais reportées
- [ ] **Page admin `/gate/users`** : CRUD users, promouvoir en gate via UI, bannir, stats globales.
- [ ] **Push notifications PWA** : notifs natives "X t'a invité dans son salon".
- [ ] **Replay stories post-partie** (Sprint 4) : photos du salon en mode stories Insta après une partie.
- [ ] **Catalogue de packs officiels** à créer depuis `/gate/packs` (BUSINESS.md liste : EVJF, Soirée Filles, Pack 18+, EVG, Noël en Famille, Après-Ski, La Tournée du Pastis…).
- [ ] **Audit vibrate Android** : tester sur device réel que `navigator.vibrate()` marche sans user-gesture explicite.
- [ ] **CSP tuning post-déploiement** : si des assets bloquent dans la console DevTools, ajuster la directive dans `client/nginx.conf`.
