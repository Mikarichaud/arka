# La Roulade Marseillaise — Vue d'ensemble

**Application web mobile-first de jeu de défis en tour par tour. Ambiance 100 % marseillaise : design, sons, textes, humour.**

- **Domaine** : [roulademarseillaise.fr](https://roulademarseillaise.fr) (l'ancien `arka.michaelrichaud.fr` redirige en 301)
- **Éditeur** : ARKA
- **Statut** : en production
- **Distribution** : PWA web (installable sur iOS / Android sans passer par l'App Store ou le Play Store)
- **Public cible** : soirées entre amis 20-45 ans, EVJF/EVG, family games, équipes en team building, bars

---

## 1. Le concept en 30 secondes

Une roulette virtuelle à 8 cases tourne en synchronisé sur les phones des joueurs. Elle s'arrête sur un défi (ex : "Imite ta mère qui appelle quelqu'un à 3 mètres"). Le joueur du tour le relève sous le regard du jury (les autres), qui votent. Scoring 1/2/3 pts selon intensité, podium en fin de partie.

Deux modes complémentaires :

| Mode | Pitch | Cible | Monétisation |
|---|---|---|---|
| **Local** | Tous dans la même pièce, un seul écran qui passe de main en main | Apéro classique, famille | Acquisition (entonnoir vers Premium) |
| **Salon** | Chacun sur son propre phone, roulette synchrone temps réel, vote distant | Soirées élaborées, longue distance, EVJF | Premium-only (création) |

Les **salons sont persistants** : un salon = un groupe d'amis qui dure dans le temps, conserve l'historique des parties, des photos, des stats par joueur.

---

## 2. Pourquoi ça marche

**3 raisons de payer qui sont non-copiables par un concurrent qui cloneraitle texte des défis :**

1. **L'expérience complète** — animation roulette synchronisée multi-device, sons, vibrations, ambiance marseillaise cohérente. Le contenu seul (texte des défis) n'a pas de valeur sans le contenant.
2. **Les souvenirs partagés** — photos/vidéos prises pendant les parties, hébergées dans Cloudinary, retrouvables dans la galerie du salon. C'est le souvenir non-monétisable d'une soirée.
3. **La persistance sociale** — Mes salons garde l'historique de qui a joué, qui a refusé, qui a gagné, semaine après semaine. Les groupes reviennent pour leurs propres stats.

---

## 3. Modèle économique

### Freemium gating

| Feature | Free | Premium | Achat one-shot |
|---|---|---|---|
| Mode local complet | ✅ | ✅ | — |
| Packs officiels gratuits (Mireille, Virage Sud) | ✅ | ✅ | — |
| Packs officiels Premium (Mouloud, EVJF…) | Teaser 1 défi | ✅ tout | ✅ achat unique |
| Création de packs perso | 1 pack / 8 défis | Illimité / 8-24 défis | — |
| Photos & vidéos pendant les parties | ❌ | ✅ | — |
| Galerie partageable QR | ❌ | ✅ | — |
| Historique de mes parties | ❌ | ✅ | — |
| **Mode Salon — création** | ❌ | ✅ | — |
| Mode Salon — rejoindre | ✅ (anonyme OK) | ✅ | — |
| Roulettes custom (skins cosmétiques) | Boule pétanque standard | + accès gratuit aux skins du shop | ✅ achat unique 2,99 € |
| Avatar photo personnel | ❌ (initiales) | ✅ | — |

### Pricing

| Offre | Prix | Type |
|---|---|---|
| **Premium Mensuel** | 4,99 € / mois | Abonnement Stripe Billing |
| **Premium Annuel** | 34,99 € / an (= 2,92 €/mois) | Abonnement Stripe Billing |
| **Pack solo** | 2,99 € à 4,99 € | One-shot Stripe Checkout |
| **Roulette cosmétique** | 2,99 € | One-shot Stripe Checkout |
| **Achat one-shot pack** | One-shot | Reste accessible même si l'abonnement Premium expire ensuite |

> Un user qui achète des packs en one-shot puis stoppe son Premium garde l'accès aux packs achetés. C'est la valeur "à vie" pour rassurer les acheteurs ponctuels.

### Rôle admin "Gaté"

Les **gatés** (admins du site, role manuel en DB) ont automatiquement l'équivalent Premium permanent. Ça leur permet de gérer le contenu (packs officiels, cosmétiques, catégories) et de tester sans payer un abonnement à leur propre instance.

---

## 4. Méthodes de paiement

### Prestataire : Stripe

Toute la facturation passe par **Stripe**, principalement pour 3 raisons :
- API Checkout hostée (PCI-DSS pris en charge par Stripe, pas de carte stockée chez nous)
- Billing Portal hostée (l'utilisateur gère son abonnement, change de carte, annule sans qu'on touche au code)
- Webhooks signés (synchronisation fiable entre le paiement et notre base)

### Flux utilisateur Premium (abonnement)

```
1. User clique "Passer Premium" sur /premium
2. Sélectionne Mensuel ou Annuel
3. Backend appelle Stripe API → crée une session Checkout
4. Redirection vers checkout.stripe.com (page Stripe hostée)
5. User entre sa CB (jamais sur notre serveur)
6. Paiement validé → Stripe redirige vers /premium/success
7. Stripe envoie un webhook signé checkout.session.completed
8. Notre backend met à jour User.tier='premium' + currentPeriodEnd
9. User a accès immédiat aux features Premium
```

### Flux utilisateur Pack one-shot

```
1. User clique sur un pack verrouillé → modale Paywall
2. Backend crée session Stripe Checkout mode=payment
3. Redirection Stripe → CB → succès
4. Webhook checkout.session.completed avec metadata kind:cosmetic ou kind:pack
5. Backend $addToSet le slug dans User.purchasedPacks ou User.purchasedSkins
6. User a l'accès permanent à ce pack/skin (même si Premium expire)
```

### Gestion abonnement par l'utilisateur

```
1. User va dans /profile → "Gérer mon abonnement"
2. Backend crée une session Stripe Billing Portal
3. Redirection vers billing.stripe.com (page Stripe hostée)
4. User peut : changer de CB, annuler, voir l'historique des factures
5. Si annulation : Stripe envoie customer.subscription.updated avec cancel_at_period_end:true
6. Backend met User.subscription.cancelAtPeriodEnd=true → message marseillais affiché en profile
7. À la date de fin, Stripe envoie customer.subscription.deleted → User.tier='free'
   (mais purchasedPacks et purchasedSkins préservés)
```

### Webhooks gérés

| Event Stripe | Action serveur |
|---|---|
| `checkout.session.completed` (mode=subscription) | Active Premium + sync currentPeriodEnd |
| `checkout.session.completed` (mode=payment, kind=cosmetic) | `$addToSet` slug dans `purchasedSkins` |
| `checkout.session.completed` (mode=payment, kind=pack) | `$addToSet` ObjectId dans `purchasedPacks` |
| `customer.subscription.updated` | Sync status + currentPeriodEnd + cancelAtPeriodEnd |
| `customer.subscription.deleted` | tier='free', status='canceled' (achats préservés) |
| `invoice.payment_failed` | status='past_due' (l'user est notifié par Stripe par email) |

### Sécurité paiement

- **Aucune CB n'est stockée sur nos serveurs** — tout passe par Stripe.
- Webhooks **signés cryptographiquement** (header `stripe-signature`) et vérifiés à chaque requête.
- Body brut préservé pour la vérification de signature (middleware Express conditionnel sur `/api/payments/webhook`).
- Webhook exempté du rate-limiting global pour ne pas bloquer Stripe en cas de retry burst.
- `STRIPE_SECRET_KEY` jamais exposée client (uniquement variable d'environnement serveur).

### Avantage PWA

L'application étant distribuée via le web (et non l'App Store / Play Store), elle **évite les 30 % de commission Apple/Google**. Sur 4,99 € d'abonnement, on garde **4,84 €** (Stripe prend ~2,9 % + 0,25 €) au lieu de 3,49 € en cas de distribution mobile native.

---

## 5. Stack technique (résumé)

| Couche | Techno | Pourquoi ce choix |
|---|---|---|
| Frontend | React 19 + Vite | Standards modernes, hot reload rapide |
| Mobile | PWA (vite-plugin-pwa) | Installable iOS/Android sans store, mises à jour instantanées, économie 30 % commission |
| Backend | Node.js 22 + Express 5 | JS unifié front/back, écosystème mature |
| Database | MongoDB + Mongoose | Schémas flexibles pour packs/défis évolutifs |
| Temps réel | Socket.IO (rooms par salon) | Synchronisation roulette multi-device |
| Médias | Cloudinary | CDN images/vidéos, transformations à la volée |
| Paiements | Stripe Checkout + Billing | PCI-DSS hosté, abonnements gérés |
| Hébergement | OVH VPS Debian + Docker Compose | Coût maîtrisé (~10 €/mois), souveraineté française |
| SSL | Let's Encrypt (certbot) | Gratuit, renouvellement auto 12h |
| SEO | react-helmet-async + sitemap dynamique | Indexation Google + previews WhatsApp/iMessage |

---

## 6. Données utilisateur & confidentialité

### Ce qu'on stocke

| Donnée | Stockage | Pourquoi |
|---|---|---|
| Pseudo, email, hash password (bcrypt) | MongoDB | Auth |
| Avatar (URL Cloudinary) | MongoDB + Cloudinary | Affichage profil |
| stripeCustomerId, stripeSubscriptionId | MongoDB | Lier user ↔ Stripe (pas de CB chez nous) |
| Historique parties locales | MongoDB | Stats user |
| Photos / vidéos de salons | Cloudinary | Galerie partageable |
| Pseudos anonymes en salon | MongoDB (Salon.players) | Identifier joueurs entre sessions |

### Ce qu'on **ne stocke pas**

- **Aucune CB** (gérée 100 % par Stripe)
- Pas de géolocalisation
- Pas de tracking analytics tiers (Google Analytics, FB Pixel, etc.)
- Pas de cookies tiers
- Service Worker PWA ne cache que les assets statiques + courte fenêtre API (5s timeout)

### Conformité RGPD

- Données stockées sur VPS OVH **en France** (souveraineté UE)
- Cloudinary est conforme RGPD (DPA disponible)
- Stripe est conforme RGPD (DPA disponible)
- Right to access / right to deletion : possible via `mongosh` côté admin (action manuelle pour l'instant, un endpoint `DELETE /api/users/me` est prévu en roadmap polish)
- Pas de newsletter / pas de mail marketing → pas de gestion d'opt-in
- Pages privées (`/profile`, `/history`, `/salon/*`) explicitement `Disallow` dans `/robots.txt`

---

## 7. État d'avancement

### Livré et en production

- ✅ Mode local complet (jeu, scoring, podium, EndGame, galerie)
- ✅ Authentification (pseudo OU email + JWT)
- ✅ Création de packs perso + import par code
- ✅ Espace admin "gaté" (CRUD packs officiels, cosmétiques, catégories)
- ✅ Freemium gating server-side (teaser pour Free, contenu protégé)
- ✅ Stripe Checkout + Billing Portal + Webhooks (mode test actuellement)
- ✅ Cosmétiques (3 skins de roulette) avec sync Stripe auto
- ✅ Avatar premium, dark mode, sons synthétisés, vibrations
- ✅ Mode Salon temps réel (Phase 9 complète : Sprints 1-5)
- ✅ Mes salons persistants (groupes qui survivent aux soirées)
- ✅ Historique de salon : parties, stats joueurs, galerie photos
- ✅ Toast d'arrivée, sons + vibrations synchronisés multi-device
- ✅ Audit sécurité (Cloudinary v2 patch CVE, ws override, regex auth, JWT 1d, CSP nginx)
- ✅ SEO technique (meta + OG + sitemap dynamique + JSON-LD)

### Reste à faire (ordre de priorité business)

1. **Passer Stripe en mode LIVE** (clés sk_live_*, webhook prod, premiers vrais paiements)
2. **Image OG dédiée 1200×630** (preview WhatsApp/iMessage actuellement carrée)
3. **Soumission Search Console + Bing** (indexation rapide)
4. **Catalogue de packs payants** à créer via /gate (EVJF, EVG, Pack 18+, Noël, etc.)
5. **Acquisition Phase 8.2** : TikTok / Reels, groupes EVJF Facebook PACA
6. **Page admin /gate/users** pour promouvoir des gatés sans passer par mongosh
7. **B2B Bars** : licence dédiée à 29 €/mois avec branding + QR table

---

## 8. Projections business

| Mois | MAU estimé | Conversion Premium | MRR estimé |
|---|---|---|---|
| M1 – M2 | 300 | 4 % | ~60 € |
| M3 – M4 | 800 | 5 % | ~200 € |
| M6 | 2 000 | 6 % | ~600 € |
| M12 | 6 000 | 7 % | ~2 100 € |

**Seuil de rentabilité** : ~150 €/mois (VPS OVH 10 € + Cloudinary plan gratuit + frais Stripe ~3 %). Atteignable à M3.

**Hypothèse acquisition** : 1 clip viral TikTok = 10 000+ visiteurs potentiels. Le coût d'acquisition reste à zéro tant qu'on reste sur du contenu organique.

---

## 9. Différenciation

Comparé aux clones potentiels qui copieraient le texte des défis :

- ❌ Ils n'ont pas l'animation roulette synchronisée multi-device
- ❌ Ils n'ont pas l'écosystème de salons persistants
- ❌ Ils n'ont pas Cloudinary + galeries partageables
- ❌ Ils n'ont pas la cohérence visuelle/sonore (Bebas Neue, palette pétanque, sons synthétisés Web Audio)
- ❌ Ils n'ont pas le ton marseillais authentique (10 ans à entendre "té")
- ❌ Ils n'ont pas le contenu mensuel renouvelé qui justifie l'abonnement

Le produit n'est pas le **texte des défis** mais l'**expérience complète d'une soirée bien orchestrée**.

---

*Document créé le 2026-05-19. À mettre à jour à chaque pivot business majeur.*
*Pour la stratégie pricing détaillée et roadmap packs, voir aussi `BUSINESS.md`.*
*Pour la doc technique détaillée (architecture, routes, modèles), voir `CLAUDE.md`.*
