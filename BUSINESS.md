# La Roulade Marseillaise — Modèle Business

## Vision produit

Application web PWA de jeu de défis en tour par tour, thème 100% marseillais.  
La valeur vendue n'est **pas le texte des défis** — c'est **l'expérience complète de la soirée** :
roulette, ambiance, médias, souvenirs partagés.

---

## Tiers & Pricing

| Tier | Prix | Description |
|---|---|---|
| **Gratuit** | €0 | Accès permanent, sans CB |
| **Pack solo** | €2,99 – €4,99 | Achat définitif d'un pack thématique |
| **Bundle 3 packs** | €6,99 | Économie ~22% vs achat séparé |
| **Roulette custom** | €1,99 – €3,99 | Skin cosmétique, achat définitif |
| **Premium mensuel** | €4,99 / mois | Accès illimité à tout le contenu |
| **Premium annuel** | €34,99 / an | = €2,92/mois — ancre vs mensuel |

---

## Features : Gratuit vs Premium

### Gameplay de base

| Feature | Gratuit | Premium |
|---|---|---|
| Roulette animée (boule de pétanque) | ✅ | ✅ |
| Timer PastisTimer | ✅ | ✅ |
| Système de vote | ✅ | ✅ |
| Scoring & podium | ✅ | ✅ |
| Mode Exagérateur x2 | ✅ | ✅ |
| Easter egg Radar à Parisiens | ✅ | ✅ |
| Nombre de joueurs | 2 – 6 | 2 – 10 |

---

### Packs de défis

| Feature | Gratuit | Premium |
|---|---|---|
| Pack "Mireille" (défis de daronne) | ✅ | ✅ |
| Pack "Virage Sud" (défis de supporters) | ✅ | ✅ |
| Aperçu des packs premium (1 défi sur 8) | ✅ | ✅ |
| Accès complet aux packs premium | ❌ | ✅ |
| Nouveaux packs chaque mois | ❌ | ✅ |
| Contenu des packs côté serveur | Jamais exposé sans auth premium | — |

---

### Médias (photos & vidéos)

| Feature | Gratuit | Premium |
|---|---|---|
| Prendre une photo/vidéo pendant la partie | ❌ | ✅ |
| Upload Cloudinary automatique | ❌ | ✅ |
| Galerie de soirée partageable (/gallery/:shareLink) | ❌ | ✅ |
| Lien de partage QR code | ❌ | ✅ |
| Téléchargement des médias | ❌ | ✅ |

> **Justification** : les médias sont le souvenir non-copiable de la soirée.
> C'est la feature qui justifie le plus naturellement l'abonnement.

---

### Historique & Stats

| Feature | Gratuit | Premium |
|---|---|---|
| Récap de fin de partie (podium + stats basiques) | ✅ | ✅ |
| Historique des tours dans EndGame | ✅ | ✅ |
| Historique des parties sauvegardées (/history) | ❌ | ✅ |
| Stats avancées par joueur | ❌ | ✅ |

---

### Création de packs custom

| Feature | Gratuit | Premium |
|---|---|---|
| Créer un pack custom | 1 pack max | Illimité |
| Nombre de défis par pack | 8 (fixe) | 8 à 24 |
| Partager un pack via code | ❌ | ✅ |
| Importer un pack via code | ❌ | ✅ |
| Jouer avec ses packs custom | ✅ | ✅ |

---

### Roulettes custom (achats séparés)

Skins cosmétiques pour la boule de pétanque — achat one-shot, pas lié à l'abonnement.

| Roulette | Prix | Thème |
|---|---|---|
| Boule OM (bleu & blanc) | €1,99 | Supporters |
| Boule Pastis (jaune anisé) | €1,99 | Apéro |
| Boule Calanques (turquoise & pierre) | €2,99 | Nature |
| Boule Feu (rouge & or) | €2,99 | Soirée chaude |
| Boule Nuit des Goudes (full dark) | €3,99 | Dark mode exclusif |
| Pack toutes les roulettes | €9,99 | Économie ~40% |

> La roulette de base (boule de pétanque métal) reste gratuite.

---

## Catalogue packs payants (roadmap)

| Pack | Prix | Cible | Saison |
|---|---|---|---|
| EVJF à Marseille | €3,99 | Futures mariées + organisatrices | Printemps/été |
| Soirée Filles | €2,99 | Groupes d'amies 20-35 ans | Toute l'année |
| Pack 18+ | €4,99 | Couples + soirées adultes | Toute l'année |
| EVG (Enterrement Vie Garçon) | €3,99 | Groupes d'hommes | Printemps/été |
| Noël en Famille | €2,99 | Familles | Décembre |
| Team Building | €4,99 | Entreprises | Rentrée sept. |
| Pack Couple | €2,99 | Duos | Saint-Valentin |
| La Tournée du Pastis | €2,99 | Soirées bar | Toute l'année |

---

## Protection du contenu

### Principe fondamental
> Le texte des défis **ne quitte jamais le serveur** sans vérification d'abonnement actif.

### Implémentation serveur

```
GET /api/packs/:id

→ Pack gratuit                    → retourne les 8 challenges complets
→ Pack premium, user non abonné  → retourne name, description, teaser (1 défi flou)
→ Pack premium, user abonné      → retourne les 8 challenges complets
```

### Ce qui est non copiable

| Élément | Pourquoi impossible à copier |
|---|---|
| Photos & vidéos de la soirée | Souvenir unique, hébergé sur Cloudinary |
| Galerie partageable | Lien unique généré, accès conditionnel |
| Roulette animée + sons + ambiance | Trop complexe à recréer |
| L'effet surprise de la rotation | Impossible à simuler manuellement |
| Nouveaux packs mensuels | Flux continu = raison de rester abonné |
| Skins de roulette | Cosmétique lié au compte |

---

## Projections MRR (réalistes)

| Mois | MAU | Conversion | MRR estimé |
|---|---|---|---|
| M1 – M2 | 300 | 4% | ~€60 |
| M3 – M4 | 800 | 5% | ~€200 |
| M6 | 2 000 | 6% | ~€600 |
| M12 | 6 000 | 7% | ~€2 100 |

**Seuil de rentabilité** (serveur + Stripe 3%) : ~€150/mois → atteignable à M3.

---

## Stratégie d'acquisition

### Canal 1 — TikTok / Instagram Reels (priorité absolue, coût zéro)
- Filmer de vraies parties, couper sur les moments drôles
- Format "soirée entre amis" + humour marseillais = viral naturel
- 1 clip viral = 10 000+ téléchargements potentiels

### Canal 2 — Groupes EVJF Facebook PACA
- Les organisatrices cherchent activement des animations
- Conversion directe sans friction
- Posts dans : "EVJF Marseille", "EVJF PACA", "Mariage Provence"

### Canal 3 — B2B Bars & Restaurants (phase 2)
- Licence bar : €29/mois ou €199/an
- Inclut : logo bar dans l'app, QR code tables, pack "maison" personnalisé
- Objectif : 20 bars à Marseille = €580 MRR récurrents + vitrine gratuite
- Cible initiale : bars du Vieux-Port, cours Julien, La Plaine

---

## Stack technique paiement

| Composant | Technologie | Raison |
|---|---|---|
| Paiement one-shot (packs, skins) | Stripe Checkout | Simple, sécurisé |
| Abonnement récurrent | Stripe Billing | Gestion auto des renewals |
| Distribution | PWA (pas d'app store) | 0% commission Apple/Google vs 30% |
| Webhooks | Stripe → Express | Mise à jour subscription en temps réel |

> **Avantage PWA** : en passant par le web (pas l'App Store), on évite les 30% de commission
> Apple/Google → on garde **97% des revenus** (3% frais Stripe uniquement).

---

## Roadmap technique (dans l'ordre)

1. **Champ `isPremium` sur les packs** + champ `tier` sur User (free/premium)
2. **Middleware serveur** — vérifie subscription avant de retourner le contenu complet
3. **Paywall UX** — modale au clic sur un pack verrouillé, teaser 1 défi flou
4. **Stripe** — achat pack one-shot + abonnement mensuel/annuel
5. **Webhooks Stripe** — mise à jour automatique du tier en base
6. **Roulettes custom** — champ `skin` sur User, sélecteur dans les settings
7. **B2B dashboard** — interface simple pour les partenaires bars

---

*Document créé le 2026-04-20 — à mettre à jour à chaque décision business majeure.*
