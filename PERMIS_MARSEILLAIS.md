# Le Permis Marseillais — Spec technique (V2)

> Feature centrale de la V2 : un examen payant qui délivre un **certificat marseillais**
> vérifiable et partageable. Contenu des questions → voir **`PERMIS_MARSEILLAIS_QUIZ.md`**.

## 1. Principe & règles métier (figées)

| Règle | Valeur |
|---|---|
| Test blanc | gratuit, **20 questions dédiées**, **1×/jour**, pas de chrono, pas de certificat |
| Examen | payant, **20 questions tirées au hasard parmi 80**, chrono **13 s/question** |
| Achat | **13 €** = lot de **3 essais**, **re-payable** |
| Score officiel | **meilleur des 3** (en réalité : max de tous les essais payés) |
| Certificat | **1 par compte**, MAJ si record battu, page publique `/certificat/:code` |
| Note | sur **/20** (1 pt/question) |
| Paiement | **web = Stripe** · **iOS = Apple IAP** (consommable), même compteur d'essais serveur |
| Scoring | **100 % côté serveur** — les bonnes réponses ne quittent jamais le serveur |

### Bornes de mention (sur /20)
`0–4` Estranger · `5–9` Parisien démasqué *(ou « En stage » si CP 13)* · `10–13` Marseillais d'adoption · `14–16` Bon petit Marseillais · `17–18` Vrai de vrai · `19–20` Patron du Vieux-Port.
**Homologué** = score ≥ 10. **Twist CP** : Parisien qui réussit → « Repenti toléré » ; CP 130xx qui rate → mention roast renforcée. (Réutilise `utils/provenance.js`.)

## 2. Modèles MongoDB

### QuizQuestion
```js
{
  category: 'parler' | 'bouffe' | 'om' | 'geo' | 'culture',
  text: String,
  options: [String],            // exactement 4
  correctIndex: Number,         // 0–3 — JAMAIS envoyé au client en mode examen
  difficulty: 'facile' | 'moyen' | 'difficile',
  scope: 'trial' | 'exam',      // 20 trial / 80 exam
  isActive: Boolean (default true),
  createdAt: Date
}
```
Authoring via l'espace **gate** (comme packs/défis). Validation serveur : 4 options, correctIndex ∈ [0,3].

### Certificate (1 par user, créé à la 1re action — achat ou test)
```js
{
  userId: ObjectId → User (unique),
  pseudo: String,               // dénormalisé au moment de l'émission
  postalCode: String,           // dénormalisé → twist provenance sans round-trip
  provenanceZone: String,       // getProvenance(cp).zone
  attemptsRemaining: Number (default 0),   // crédité par paiement, décrémenté au start d'examen
  attemptsTaken: Number (default 0),
  bestScore: Number | null,     // 0–20
  mention: String | null,       // libellé calculé au moment du record
  passed: Boolean (default false),          // bestScore >= 10
  publicCode: String (unique, nanoid 10),   // /certificat/:code — généré à la 1re émission
  issuedAt: Date | null,        // 1er essai d'examen terminé
  recordAt: Date | null,        // date du meilleur score
  lastTrialAt: Date | null,     // pour le quota 1×/jour du test blanc
  history: [{ score: Number, mode: 'exam', takenAt: Date }],
  createdAt: Date
}
```

### ExamSession (anti-triche, éphémère, TTL)
```js
{
  userId: ObjectId → User,
  mode: 'trial' | 'exam',
  questionIds: [ObjectId],      // les 20 tirées
  startedAt: Date,
  expiresAt: Date,              // startedAt + 20*13s + marge (ex: +30s) → index TTL Mongo
  status: 'in-progress' | 'submitted' | 'expired',
  score: Number | null
}
```
Index TTL sur `expiresAt`. Le `correctIndex` n'est lu que côté serveur au submit.

## 3. Flux

### Test blanc (gratuit)
1. `POST /permis/trial/start` (protect) → si `lastTrialAt` < aujourd'hui : 403 `TRIAL_COOLDOWN`. Sinon set `lastTrialAt=now`, tire 20 questions `scope:'trial'`, crée ExamSession `mode:'trial'`, renvoie questions **sans correctIndex** + `sessionId`.
2. `POST /permis/trial/submit` → score serveur, renvoie note + mention *teaser* + CTA « Passe le vrai Permis ». **Aucun certificat.**

### Examen (payant)
1. `POST /permis/exam/start` (protect) → si `attemptsRemaining <= 0` : 402 `NO_ATTEMPTS`. Sinon **décrément immédiat** de `attemptsRemaining` (un essai abandonné/expiré est perdu — c'est un vrai examen), `attemptsTaken++`, tire **20 questions `scope:'exam'`** au hasard, crée ExamSession `mode:'exam'`, renvoie questions sans correctIndex + `sessionId` + `serverDeadline`.
2. `POST /permis/exam/submit` `{ sessionId, answers:[{questionId, choiceIndex}] }` →
   - vérifie session : appartient au user, `status==='in-progress'`, pas expirée (sinon score = réponses reçues avant deadline / ou 0).
   - score = nb de bonnes réponses ; calcule mention (avec twist CP).
   - **best-of** : si `score > bestScore` → MAJ `bestScore`, `mention`, `passed`, `recordAt`. Toujours : push `history`, set `issuedAt` si vide, génère `publicCode` si vide.
   - renvoie `{ score, mention, passed, isRecord, publicCode, attemptsRemaining }`.

### Paiement
- **Web (Stripe)** : `POST /permis/checkout` (protect) → Checkout `mode:'payment'`, `metadata:{ userId, kind:'permis' }`. Webhook `checkout.session.completed` (handler existant) : si `kind==='permis'` → `Certificate.attemptsRemaining += 3` (upsert le certificat).
- **iOS (Apple IAP)** : produit **consommable** `fr.roulademarseillaise.permis3`. Plugin **RevenueCat** (`@revenuecat/purchases-capacitor`). Achat côté app → webhook RevenueCat → `POST /permis/iap/webhook` (vérif signature/Authorization) → `attemptsRemaining += 3`. **Jamais** créditer depuis le client.

## 4. Routes API

```
GET    /api/permis/status              # (protect) { attemptsRemaining, bestScore, mention, passed, publicCode, canTrialToday }
POST   /api/permis/trial/start         # (protect) 1×/jour → 20 Q trial sans correctIndex + sessionId
POST   /api/permis/trial/submit        # (protect) score + mention teaser (pas de certificat)
POST   /api/permis/exam/start          # (protect, attemptsRemaining>0) décrément + 20 Q exam + sessionId + deadline
POST   /api/permis/exam/submit         # (protect) score serveur + MAJ certificat (best-of)
POST   /api/permis/checkout            # (protect) Stripe Checkout one-shot kind:'permis'  (web)
POST   /api/permis/iap/webhook         # (RevenueCat) crédite +3 essais  (iOS)
GET    /api/permis/certificate/:code   # PUBLIC → données certificat pour la page SEO

# Espace gate (requireGate)
GET    /api/gate/quiz                  # liste + filtres (catégorie, scope, difficulté)
POST   /api/gate/quiz                  # créer une question
PUT    /api/gate/quiz/:id              # éditer
DELETE /api/gate/quiz/:id              # soft-delete (isActive=false)
```
- Webhook Stripe : étendre le handler `checkout.session.completed` pour `kind:'permis'` (à côté de `kind:'cosmetic'`).
- Rate limit : `exam/start` et `trial/start` à throttler légèrement (anti-abus).

## 5. Client (React)

### Navigation
Nouvel onglet **« Le Permis »** dans la barre du bas (feature autonome). **Visible en `STORE_BUILD`** — c'est la **seule surface commerciale autorisée sur iOS**, via IAP uniquement.

### Pages
- `pages/Permis/PermisHome.jsx` — pitch officiel, statut du certificat (badge + meilleure mention), CTA :
  - « Tenter le test blanc » (gratuit, grisé si déjà fait aujourd'hui),
  - « Passer le Permis » (si `attemptsRemaining>0`),
  - « Acheter 3 essais — 13 € » (→ Stripe sur web, → IAP sur iOS).
- `pages/Permis/PermisExam.jsx` — runner commun trial/examen : 1 question à l'écran, **chrono 13 s** (barre qui descend), progression x/20, sons réutilisés (`validate`/`refuse`/`timer`). À l'expiration du chrono → question suivante, réponse = non répondue.
- `pages/Permis/PermisResult.jsx` — révélation du score (anim `carreau`), mention, « record battu ! »,
  puis **choix du format** (paysage / portrait) pour télécharger / partager le diplôme.
- `pages/Certificate/CertificatePublic.jsx` — page **publique** `/certificat/:code` : diplôme léché (parchemin, bleu azur + or étoile, sceau « Préfecture Marseillaise » fictif, pseudo, mention, score, matricule = publicCode, **badge provenance**, **QR** vers la page), bouton « Télécharger » (image) + partage. Indexable (`<SEO>`).

### Store
- `store/permisStore.js` (Zustand) : état de la session d'examen courante (questions, index, réponses, timer), `submit()`.

### Paiement côté client
```js
const buy = STORE_BUILD ? buyViaRevenueCat : startStripeCheckout;
```
- Web : `POST /permis/checkout` → redirect Stripe.
- iOS : `Purchases.purchaseStoreProduct(...)` (RevenueCat) ; le crédit arrive par webhook serveur, le client re-fetch `/permis/status`.

### SEO
Ajouter les certificats publics au **sitemap dynamique** (comme les galleries/packs `shareCode`).

## 6. Espace gate — authoring
Nouvel écran `pages/Gate/GateQuiz.jsx` : CRUD `QuizQuestion` (catégorie, scope, difficulté, 4 options + bonne réponse), compteur par catégorie/difficulté pour piloter l'équilibre 40 D / 25 M / 15 F. Seed initial depuis `PERMIS_MARSEILLAIS_QUIZ.md` une fois validé.

## 7. Impacts App Store / flags
- `STORE_BUILD` n'est plus « masque TOUT le commerce » : il **laisse passer le Permis en mode IAP** (pas de Stripe, pas de lien web depuis l'app → règle anti-steering 3.1.1).
- Nouvelle review iOS : déclarer le produit IAP consommable + capture d'écran de l'achat.
- `Small Business Program` Apple → commission 15 %.

## 8. Séquençage de build (dérisqué)
1. **Moteur** : modèles + routes examen/scoring serveur + écrans React + page publique + authoring gate. *(Indépendant du paiement.)*
2. **Rail Stripe (web)** : checkout + webhook `kind:'permis'`. → Permis live et monétisé sur le web.
3. **Rail Apple IAP (iOS)** : RevenueCat + produit consommable + webhook + flags `STORE_BUILD` + re-soumission.

## 9. Points encore ouverts
- [ ] Validation finale de la banque (100 questions, équilibre difficulté).
- [ ] Prix IAP exact (palier Apple le plus proche de 13 €).

### Décidé
- ✅ **Test blanc réservé aux connectés** (cohérent « force signup », quota 1×/jour serveur).
- ✅ **Autorité émettrice** : « République Marseillaise · Préfecture de la Bonne Mère »,
  sceau **« Homologué »**, signataire « Le Préfet de la Bonne Mère ».
- ✅ **Deux formats de diplôme** : **paysage** (défaut, sert aussi d'image OG) **et portrait**.
  Le joueur **choisit son format au moment du téléchargement/partage**, après le test.
  Maquettes de référence : `mockups/permis-certificat.html` (paysage) et
  `mockups/permis-certificat-portrait.html` (portrait).
- ✅ **Image du certificat rendue côté serveur** → diplôme identique partout + image OG.
  Route : `GET /api/permis/certificate/:code/image.png?format=paysage|portrait` (défaut paysage).
  Stack pressentie : **satori** (JSX → SVG) + **@resvg/resvg-js** (SVG → PNG), ou `@napi-rs/canvas`.
  L'image OG (format paysage) est référencée dans le `<SEO>` de la page publique `/certificat/:code`.
</content>
