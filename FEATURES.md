# La Roulade Marseillaise — Features livrées

> Journal des fonctionnalités déjà développées, extrait de **CLAUDE.md** pour le garder focalisé sur la référence active (archi, modèles, routes, règles de code). Ce fichier est historique : il décrit ce qui a été livré phase par phase. Pour l'état courant de référence, voir [CLAUDE.md](CLAUDE.md).

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
