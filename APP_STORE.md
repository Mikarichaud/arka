# Mise en production App Store (iOS) — Roadmap

> Plan de passage de la PWA **La Roulade Marseillaise** vers l'**App Store iOS**.
> Décisions actées : **iOS d'abord**, **lancement tout débloqué** (`FEATURES_UNLOCKED=true`,
> achats in-app reportés en V2), **wrapper Capacitor**. Android viendra ensuite.

---

## 0. Décisions structurantes

| Sujet | Choix V1 | Raison |
|---|---|---|
| Plateforme | iOS d'abord | Public iPhone + confiance |
| Wrapper | **Capacitor** (bundle `dist` + API distante) | Garde le code React, coquille crédible (évite le rejet 4.2) |
| Monétisation | **Aucune dans l'app** (tout débloqué) | Évite Apple IAP en V1, review simple, sortie rapide |
| IAP | **V2** | StoreKit + synchro entitlements = chantier séparé |
| Bundle ID proposé | `fr.roulademarseillaise.app` | Reverse-DNS du domaine |
| Compte / structure | **Apple Individual, en particulier** (pas de société) | App gratuite V1 → aucune immatriculation requise. Société + Apple Organization seulement à la monétisation (V2) |

---

## 1. Prérequis & comptes

> **Décision (option A)** : lancement **gratuit, en tant que particulier**. Pas de société,
> pas de SIRET, pas de D-U-N-S pour la V1 → compte Apple **Individual**. On créera une
> structure (micro ou SASU « ARKA ») + un compte Apple **Organization** uniquement quand
> on activera la monétisation (IAP V2).

- [ ] **Apple Developer Program — type Individual** — 99 $/an (https://developer.apple.com/programs/).
  Aucun D-U-N-S requis. Vendeur affiché = nom légal (Michael Richaud).
- [ ] **Xcode** à jour sur le Mac (+ command line tools)
- [ ] Accès **App Store Connect** (créé avec le compte développeur)
- [ ] **Certificat de distribution + provisioning profile** (géré automatiquement par Xcode « Automatically manage signing »)
- [ ] Node 22 + le repo qui build déjà (`npm run build` côté client = OK)

---

## 2. Architecture technique Capacitor

L'app native **embarque le build statique** (`client/dist`) et **tape l'API distante**
sur `https://roulademarseillaise.fr`. On NE charge PAS une simple URL distante (ferait
« web wrapper » → risque rejet 4.2).

### 2.1 Setup — ✅ FAIT (Capacitor 8, projet iOS généré)
- [x] `@capacitor/{core,cli,ios}` ^8.3.4 installés ; projet `client/ios/` généré
  (App.xcodeproj, bundle ID `fr.roulademarseillaise.app`). Capacitor 8 = **SPM** (pas de CocoaPods).
- [x] `npm run build:store && npx cap sync ios` exécuté → bundle natif contient l'API absolue
  (`https://roulademarseillaise.fr/api`) + commerce masqué. Permissions Info.plist en place.

**À chaque nouvelle version** : `npm run build:store && npx cap sync ios`.
**Ouvrir Xcode** : `npx cap open ios`.

> `ios/` est généré par Capacitor. À committer (sauf `ios/App/Pods/` et artefacts de
> build — ajouter au `.gitignore`).

### 2.2 Points d'intégration — ✅ FAIT côté code
- [x] **Base URL API absolue sur natif** : `build:store` injecte
  `VITE_API_URL=https://roulademarseillaise.fr/api` (api.js le consomme déjà). Le web
  garde `/api` relatif.
- [x] **URL Socket.IO absolue** : `useSalonSocket.js` dérive l'origine serveur de
  `VITE_API_URL` (absolu → `io('https://…')`, relatif → same-origin).
- [x] **CORS serveur** : `capacitor://localhost` (iOS) + `http://localhost` (Android)
  ajoutés à l'allowlist prod dans `server/src/app.js` ET `server/server.js` (Express + Socket.IO).
- [x] **Service worker** : `registerSW` désactivé sur le build natif via `!STORE_BUILD` (`main.jsx`).
- [x] **Auth** : JWT en header `Bearer` → marche en WKWebView (pas de cookie cross-origin). ✅

---

## 3. ⚠️ Conformité paiements iOS (build « tout débloqué ») — ✅ FAIT

Apple rejette toute app qui **vend OU affiche un chemin d'achat** de biens numériques
hors IAP (règle 3.1.1). Tout le commerce est masqué dans le build magasin :

- [x] Flag de build `VITE_STORE_BUILD` exposé via `STORE_BUILD` (`utils/permissions.js`),
  indépendant de `FEATURES_UNLOCKED`. Build dédié : **`npm run build:store`**
  (= `VITE_STORE_BUILD=true VITE_FEATURES_UNLOCKED=true vite build`).
- [x] **Masqué** sur le build magasin :
  - [x] Routes `/premium` + `/premium/success` → redirigées vers `/` (App.jsx)
  - [x] CTA « Premium » / « Découvrir Premium » de la Home
  - [x] Onglet **boutique cosmétiques** (PackLibrary) + bouton « Acheter » et prix (`CosmeticCard`)
  - [x] `PaywallModal` (ne s'ouvre jamais) + upsell « photo Premium » EndGame + upsells Editor
  - [x] Profil : section abonnement (« Passer Premium » + portail Stripe)
- [x] Web (PWA) inchangé : `STORE_BUILD=false` → tout le commerce reste visible sur le site.

> Note : les chaînes (« Acheter », « Passer Premium ») restent dans le JS minifié derrière
> une branche runtime jamais exécutée — invisible à l'usage, ce que vérifie la review Apple.

---

## 4. Tâches dev BLOQUANTES pour la review

Indépendantes des paiements — Apple les exige vu les features.

### 4.1 Suppression de compte in-app (obligatoire depuis 2022) — ✅ FAIT
- [x] **Backend** : route `DELETE /api/users/me` (protect) — **suppression dure + nettoyage** :
  annule l'abo Stripe si actif, supprime packs persos + défis, sessions/galeries
  (`createdBy`) + `GameHistory`, ferme (status=ended) les salons hébergés, délie les
  entrées joueur (`players.userId` → null) ailleurs, puis supprime le doc User.
- [x] **Front** : bouton « Supprimer mon compte » dans Profil (section Mon compte) +
  modale de confirmation (`confirm-overlay`/`fumigenesVariants` + `useEscapeClose`),
  puis `logout()` + redirect Home.

### 4.2 Modération du contenu généré (UGC — règle 1.2) — partiellement FAIT
Les salons permettent l'upload de photos partagées (max 10 joueurs, sur invitation).
Modération **owner-only** (décidé).
- [x] **Signaler** un média : modèle `Report`, route `POST /api/salons/:code/report`
  (membre via connectionToken / userId / host), bouton « Signaler » dans la lightbox de
  la galerie d'historique salon (`SalonHistory.jsx`), dédup léger anti-spam.
- [x] **Modération owner** : onglet **Signalements** dans `/admin` (`AdminReports.jsx`)
  → preview média + signaleur + raison ; actions **Supprimer le média** (retire l'URL de
  l'historique salon + destroy Cloudinary best-effort, résout tous les reports du même
  média) ou **Rejeter**. Routes `GET /api/admin/reports` + `POST /api/admin/reports/:id/resolve`.
- [x] **EULA** accepté à l'inscription : case à cocher obligatoire dans le formulaire
  d'inscription (`AuthModal`) avec liens vers CGU + confidentialité. La charte de conduite
  + tolérance zéro + engagement de traitement sous 24h sont dans les CGU (§4.3).
- [ ] **Bloquer un joueur** côté user : non implémenté (modération owner-only assumée).
  À ajouter seulement si Apple le réclame (salons privés sur invitation → généralement toléré).
- [ ] (Filtrage auto optionnel — Cloudinary moderation add-on si besoin.)

### 4.3 Pages légales publiques — ✅ FAIT (placeholders à compléter)
- [x] **Politique de confidentialité** (`/privacy`, `pages/Legal/Privacy.jsx`) : données
  collectées, sous-traitants (Cloudinary/Stripe/OVH), conservation, suppression de compte,
  droits RGPD, contact. URL pour App Store Connect : `https://roulademarseillaise.fr/privacy`.
- [x] **CGU / EULA** (`/terms`, `pages/Legal/Terms.jsx`) : objet, compte, **charte UGC +
  tolérance zéro + signalement/modération sous 24h**, PI, abonnement, suppression, droit FR.
- [x] Liens accessibles dans l'app : Profil (sous Déconnexion) + formulaire d'inscription. Ajoutés au sitemap.
- [x] **Éditeur = particulier (Michael Richaud)** renseigné dans `Privacy.jsx` + `Terms.jsx`
  (option A). Pas de SIRET/raison sociale (app gratuite). Contact : `postmaster@roulademarseillaise.fr`.
  ➜ À revoir en SASU « ARKA » seulement à la monétisation (V2).

### 4.4 Permissions natives (Info.plist) — ✅ FAIT
- [x] `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`,
  `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription` ajoutés dans
  `client/ios/App/App/Info.plist` (textes FR clairs). Plist validé (`plutil -lint`).
- [ ] (Optionnel V2) remplacer l'`<input file>` web par le **plugin Capacitor Camera**
  pour une UX native plus propre.

---

## 5. Assets & fiche App Store Connect

- [x] **Icône app** 1024×1024 (opaque) — générée (roulette Vélodrome, fond crème). Source : `client/assets/icon-source.svg`
- [x] **Splash screen** (`@capacitor/splash-screen` + assets clair/sombre générés)
- [ ] **Screenshots** par taille requise : 6.7" (iPhone 15/16 Pro Max) + 6.5". **iPhone seul** (`TARGETED_DEVICE_FAMILY = "1"`) → pas d'iPad.
- [x] **Textes de la fiche** rédigés (voir §5.1 ci-dessous)
- [x] **Catégorie** : Principale **Jeux**, Secondaire **Divertissement**
- [x] **Age rating décidé** : **12+** (alcool léger + humour léger ; pas de pack 18+ en V1) — voir §5.2
- [x] **App Privacy décidé** : voir §5.3
- [ ] Recopier §5.1/5.2/5.3 dans App Store Connect
- [ ] **URL support** + **URL marketing** : `https://roulademarseillaise.fr`

### 5.1 Fiche figée (à recopier dans App Store Connect)

**Nom** (≤30) : `La Roulade Marseillaise`

**Sous-titre** (≤30) : `Té champion, fais pas l'estrasse`

**Catégorie** : Jeux (princ.) / Divertissement (sec.)

**Mots-clés** (≤100) : `défis,soirée,apéro,jeu,amis,roulette,marseille,evjf,fête,party,gage,multijoueur,fun`

**Texte promotionnel** (≤170) :
> Oh le gaté ! La roulette tourne, elle s'arrête sur ton défi… à toi de jouer, champion. Le jeu d'apéro 100% marseillais, à plusieurs ou chacun son tél. Allez, vé !

**Description** :
```
Oh le gaté ! Prépare l'apéro et rassemble la bande : La Roulade Marseillaise, c'est LE jeu de défis qui sent la garrigue, le mistral et le pastis.

La roulette à 8 cases tourne, té, elle s'arrête sur un défi, et le joueur du tour doit le relever sous le regard du jury (les autres collègues). Réussi ? Des points, champion. Dégonflé ? La honte, fais pas l'estrasse ! Le tout avec l'accent, l'humour et les clichés de la cité phocéenne.

🎡 COMMENT ON JOUE
• On rentre les prénoms, on lance la roulette, et que le meilleur gagne
• Chaque défi a son intensité (Facile / Moyen / Hard) et son temps imparti
• Vote du groupe pour valider un défi, scoring à la clé
• Bouton « C'est pas ma faute ! » pour retenter sa chance

📱 DEUX FAÇONS DE JOUER
• En local : tout le monde dans la même pièce, un seul téléphone qui tourne
• En salon : chacun sur son tél, la roulette se lance en même temps sur tous les écrans, le vote se fait à distance

🐟 DES PACKS POUR CHAQUE SOIRÉE
Mireille (la daronne qui fait du cinéma), Virage Sud (supporters OM), Mouloud le Pêcheur (rois de l'exagération), Soirée entre amis, et plus encore. Tu peux même créer tes propres packs de défis.

📸 LES SOUVENIRS DE LA SOIRÉE
Prends des photos et vidéos pendant les défis et retrouve-les dans la galerie partagée de la soirée.

Gratuit, sans pub, sans prise de tête. Allez l'OM, et bonne roulade, collègue !
```

**URL d'assistance / marketing** : `https://roulademarseillaise.fr`

### 5.2 Age rating (questionnaire) → résultat **12+**

| Question | Réponse |
|---|---|
| Alcool / tabac / drogues (références) | Oui — Peu fréquent / léger |
| Grossièretés / humour grossier | Oui — Peu fréquent / léger |
| Thèmes adultes / suggestifs | Aucun / léger (pas de pack 18+ en V1) |
| Violence, contenu sexuel/nudité, jeux d'argent simulés, concours, accès web illimité | Non |
| App pour enfants (Kids) | Non |

### 5.3 App Privacy (nutrition label)

**Suivi (tracking) : NON** (pas de pub, pas de SDK tiers, pas d'IDFA).

**Données collectées** — toutes *liées à l'identité*, finalité *Fonctionnement de l'app* :
| Catégorie Apple | Donnée |
|---|---|
| Coordonnées › Adresse e-mail | compte |
| Identifiants › ID utilisateur | pseudo / compte |
| Contenu utilisateur › Photos ou vidéos | médias uploadés |
| Contenu utilisateur › Autre contenu | scores, historique, galeries |
| Autres données › Autres | code postal (« badge de quartier ») |

**Non collecté** : localisation GPS, contacts, santé, finances, navigation, diagnostics/crash, historique d'achat (pas d'IAP V1). Lier à la Privacy Policy `https://roulademarseillaise.fr/privacy`.

---

## 6. Finitions natives (anti-« wrappé »)

- [x] **Edge-to-edge + StatusBar** (`@capacitor/status-bar`) : `contentInset: never`,
  status bar en overlay, **style adaptatif** clair/sombre selon la luminance du fond de
  l'écran (`src/native.js`, resync à chaque navigation via `App.jsx`). Le fond de l'app
  passe sous la status bar → fini le bandeau noir. Classe `body.native` ajoutée.
- [x] **Safe-areas** : padding top/bottom `env(safe-area-inset-*)` sur les pages (hors
  salon qui gère déjà) → contenu décollé de l'encoche / barre home (`global.css`, scope `.native`).
- [x] **Tells web supprimés** : `-webkit-tap-highlight-color`, `touch-callout`,
  `user-select: none` (sauf champs) sur `.native`.
- [x] **Icône app + splash** (`@capacitor/assets`) : source vectorielle `client/assets/icon-source.svg`
  (roulette palette **Vélodrome** — bleu OM / blanc / or, fond crème). Génère AppIcon 1024 +
  Splash clair/sombre dans `ios/.../Assets.xcassets`. Splash piloté par `@capacitor/splash-screen`
  (`launchAutoHide:false` + `hideSplash()` au montage de l'app → masque le chargement à froid).
- [x] **Haptics natifs** (`@capacitor/haptics`) : helper `haptic()` dans `native.js` (impact natif iOS
  + fallback `navigator.vibrate` web). Câblé sur le spin (jeu local + salon) et le buzz « à toi de jouer ».
- [ ] **Push notifications natives** (`@capacitor/push-notifications` + APNs) — V2.
- [ ] **Universal Links** (QR salon ouvre l'app, `apple-app-site-association`) — V2.
- [ ] **Adoption `UIScene` lifecycle** — V2 (non bloquant V1). Au lancement, le log
  *« UIScene lifecycle will soon be required… »* apparaît : Capacitor utilise encore
  l'`AppDelegate` classique. Un futur iOS l'exigera. Correctif : ajouter un `SceneDelegate`
  + clé `UIApplicationSceneManifest` dans `Info.plist` (idéalement quand Capacitor publie
  son support officiel — ne pas bricoler juste avant une soumission). Aucun impact review V1.

---

## 7. Build, test & soumission

- [ ] `npm run build` (avec env natif : API absolue + `VITE_STORE_BUILD`)
- [ ] `npx cap sync ios`
- [ ] Xcode : signing auto, bump version/build, `Info.plist` (permissions)
- [ ] Test sur device réel (caméra, salon temps réel, push si activé)
- [ ] Archive → **TestFlight** (beta interne) avant soumission publique
- [ ] Remplir la fiche App Store Connect (assets + privacy + age rating)
- [ ] **Submit for Review**

---

## 8. Checklist finale avant soumission

- [ ] Aucune UI d'achat / prix / lien paiement dans le build iOS (§3)
- [ ] Suppression de compte fonctionnelle (§4.1)
- [ ] Signalement + blocage UGC + EULA (§4.2)
- [ ] Privacy Policy + CGU en ligne et liées (§4.3)
- [ ] Permissions caméra/photos avec strings claires (§4.4)
- [ ] API + Socket.IO en URL absolue, CORS `capacitor://localhost` autorisé (§2.2)
- [ ] SW PWA désactivé sur natif (§2.2)
- [ ] App testée en TestFlight sur device réel
- [ ] Age rating + nutrition label remplis

---

## 9. Roadmap phasée (estimation indicative)

| Phase | Contenu | Charge |
|---|---|---|
| **A. Intégration Capacitor** | ✅ code fait (API/Socket absolus, CORS, SW guard, `build:store`, `capacitor.config.json`). Reste : `npm i` + `cap add ios` + Xcode sur ton Mac | code fait |
| **B. Conformité commerce iOS** | ✅ fait (flag `STORE_BUILD`, masquage de toute l'UI d'achat) | fait |
| **C. Blocages review** | suppression compte (front+back), report/block UGC, EULA | 3–5 j |
| **D. Légal & assets** | pages privacy/terms, icônes, splash, screenshots, fiche | 1–2 j |
| **E. Build & soumission** | Xcode, TestFlight, fiche ASC, submit | 1–2 j + délai review Apple (~24–48h) |
| **V2 (post-launch)** | Apple IAP + Play Billing, push natif, universal links | séparé |

---

## 10. Notes / risques

- **Rejet 4.2 (web wrapper)** : mitigé par Capacitor + bundle local + features natives
  (push/haptics) qui donnent un « vrai » feeling app.
- **Rejet 3.1.1 (paiement)** : mitigé par le masquage total du commerce (§3).
- **Rejet 1.2 (UGC)** : prévoir report/block dès la V1 (§4.2).
- **Android plus tard** : Capacitor réutilisable (`npx cap add android`), Play Console
  25 $ une fois, review plus souple. Mêmes contraintes IAP (Play Billing) pour la V2.
