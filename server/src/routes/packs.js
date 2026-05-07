const express = require('express');
const { nanoid } = require('nanoid');
const router = express.Router();
const { protect, optionalAuth } = require('../middlewares/auth');
const Pack = require('../models/Pack');
const Challenge = require('../models/Challenge');

const Category = require('../models/Category');

const FREE_PACK_LIMIT = 1;
const FREE_CHALLENGES_COUNT = 8;
const PREMIUM_CHALLENGES_MIN = 8;
const PREMIUM_CHALLENGES_MAX = 24;

async function resolveTheme(theme) {
  if (!theme) return 'custom';
  const cat = await Category.findOne({ slug: theme });
  return cat ? cat.slug : 'custom';
}

// Filtre Mongo : un pack officiel est visible publiquement s'il est actif ET (sans date de publication OU date passée).
// $ne: false matche aussi les documents où le champ est absent (packs créés avant ces nouveaux champs).
function publishedFilter() {
  const now = new Date();
  return {
    $and: [
      { $or: [{ isOfficial: false }, { isActive: { $ne: false } }] },
      { $or: [{ isOfficial: false }, { publishAt: null }, { publishAt: { $lte: now } }] },
    ],
  };
}

function hasPackAccess(user, pack) {
  // Les gatés (admin) ont accès à tout, sans achat ni abonnement
  if (user?.role === 'gate') return true;
  if (!pack.isPremium) return true;
  if (!user) return false;
  if (user.isPremiumActive()) return true;
  const purchased = (user.purchasedPacks || []).map((id) => id.toString());
  return purchased.includes(pack._id.toString());
}

// Transforme un pack premium en teaser (1 défi visible, reste masqué)
function toTeaser(pack) {
  const obj = pack.toObject ? pack.toObject() : { ...pack };
  const challenges = obj.challenges || [];
  obj.challenges = challenges.slice(0, 1).map((c) => ({ ...c, isTeaser: true }));
  obj.teaserOnly = true;
  obj.totalChallenges = challenges.length;
  return obj;
}

// Liste des packs : officiels + packs persos de l'user connecté
// Ne retourne jamais les challenges, ajoute accessible:true/false par pack.
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { theme } = req.query;
    const orClauses = [{ isOfficial: true }];
    if (req.user) orClauses.push({ author: req.user._id });
    const filter = { $and: [{ $or: orClauses }, publishedFilter()] };
    if (theme) filter.$and.push({ theme });

    const packs = await Pack.find(filter).select('-challenges').sort({ isOfficial: -1, createdAt: -1 });
    const result = packs.map((p) => {
      const obj = p.toObject();
      obj.accessible = hasPackAccess(req.user, p);
      obj.isMine = req.user ? p.author?.toString() === req.user._id.toString() : false;
      return obj;
    });
    res.json({ packs: result });
  } catch (err) { next(err); }
});

// Import par shareCode
router.get('/share/:shareCode', optionalAuth, async (req, res, next) => {
  try {
    const pack = await Pack.findOne({ shareCode: req.params.shareCode }).populate('challenges');
    if (!pack) return res.status(404).json({ message: 'Pack introuvable avec ce code.' });
    if (pack.isOfficial && (pack.isActive === false || (pack.publishAt && pack.publishAt > new Date()))) {
      return res.status(404).json({ message: 'Pack introuvable avec ce code.' });
    }
    if (hasPackAccess(req.user, pack)) {
      return res.json({ pack });
    }
    res.json({ pack: toTeaser(pack), locked: true });
  } catch (err) { next(err); }
});

// Détail d'un pack — contenu complet ou teaser selon le tier
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const pack = await Pack.findById(req.params.id).populate('challenges');
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });
    // Brouillon ou programmé : invisible pour les non-gatés (sauf l'auteur)
    if (pack.isOfficial && (pack.isActive === false || (pack.publishAt && pack.publishAt > new Date()))) {
      const isGate = req.user?.role === 'gate';
      if (!isGate) return res.status(404).json({ message: 'Pack introuvable.' });
    }
    if (hasPackAccess(req.user, pack)) {
      return res.json({ pack });
    }
    res.json({ pack: toTeaser(pack), locked: true });
  } catch (err) { next(err); }
});

// Compteur des packs persos d'un user (pour gater la création côté client)
router.get('/me/count', protect, async (req, res, next) => {
  try {
    const count = await Pack.countDocuments({ author: req.user._id });
    res.json({ count });
  } catch (err) { next(err); }
});

// Créer un pack custom — règles selon le tier de l'auteur
router.post('/', protect, async (req, res, next) => {
  try {
    const user = req.user;
    const isPremium = user.isPremiumActive();
    const { challenges: challengesData, name, description, theme, coverImage } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Il faut un nom au pack, té !' });
    }

    if (!Array.isArray(challengesData)) {
      return res.status(400).json({ message: 'Défis manquants.' });
    }

    if (isPremium) {
      if (challengesData.length < PREMIUM_CHALLENGES_MIN || challengesData.length > PREMIUM_CHALLENGES_MAX) {
        return res.status(400).json({
          message: `Un pack doit contenir entre ${PREMIUM_CHALLENGES_MIN} et ${PREMIUM_CHALLENGES_MAX} défis.`,
        });
      }
    } else {
      const existing = await Pack.countDocuments({ author: user._id });
      if (existing >= FREE_PACK_LIMIT) {
        return res.status(403).json({
          message: `Le tier Free est limité à ${FREE_PACK_LIMIT} pack perso. Passe en Premium pour en créer plus.`,
          code: 'PACK_LIMIT_REACHED',
        });
      }
      if (challengesData.length !== FREE_CHALLENGES_COUNT) {
        return res.status(400).json({
          message: `Un pack Free doit contenir exactement ${FREE_CHALLENGES_COUNT} défis.`,
        });
      }
    }

    // Thème : Premium choisit (validé contre Category), Free est forcé à "custom"
    const finalTheme = isPremium ? await resolveTheme(theme) : 'custom';

    // ShareCode + coverImage : Premium uniquement
    const packDoc = {
      name: name.trim(),
      description: description?.trim() || '',
      theme: finalTheme,
      author: user._id,
      isOfficial: false,
      isPremium: false,
      isPublic: false,
    };
    if (isPremium) {
      packDoc.shareCode = nanoid(8).toUpperCase();
      if (coverImage) packDoc.coverImage = coverImage;
    }

    const pack = await Pack.create(packDoc);
    const challenges = await Challenge.insertMany(
      challengesData.map((c) => ({ ...c, pack: pack._id }))
    );
    pack.challenges = challenges.map((c) => c._id);
    await pack.save();
    await pack.populate('challenges');
    res.status(201).json({ pack });
  } catch (err) { next(err); }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const user = req.user;
    const isPremium = user.isPremiumActive();
    const pack = await Pack.findById(req.params.id);
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });
    if (pack.author?.toString() !== user._id.toString()) {
      return res.status(403).json({ message: 'C\'est pas ton pack ça !' });
    }

    const { challenges: challengesData, name, description, theme, coverImage } = req.body;

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Il faut un nom au pack, té !' });
      pack.name = name.trim();
    }
    if (description !== undefined) pack.description = description?.trim() || '';

    if (theme !== undefined) {
      pack.theme = isPremium ? await resolveTheme(theme) : 'custom';
    }

    if (coverImage !== undefined) {
      pack.coverImage = isPremium ? (coverImage || null) : null;
    }

    // Si on reçoit de nouveaux défis, on remplace l'ensemble
    if (Array.isArray(challengesData)) {
      if (isPremium) {
        if (challengesData.length < PREMIUM_CHALLENGES_MIN || challengesData.length > PREMIUM_CHALLENGES_MAX) {
          return res.status(400).json({
            message: `Un pack doit contenir entre ${PREMIUM_CHALLENGES_MIN} et ${PREMIUM_CHALLENGES_MAX} défis.`,
          });
        }
      } else if (challengesData.length !== FREE_CHALLENGES_COUNT) {
        return res.status(400).json({
          message: `Un pack Free doit contenir exactement ${FREE_CHALLENGES_COUNT} défis.`,
        });
      }
      await Challenge.deleteMany({ pack: pack._id });
      const challenges = await Challenge.insertMany(
        challengesData.map((c) => ({ ...c, pack: pack._id }))
      );
      pack.challenges = challenges.map((c) => c._id);
    }

    // Premium fraîchement obtenu → générer un shareCode si absent
    if (isPremium && !pack.shareCode) {
      pack.shareCode = nanoid(8).toUpperCase();
    }

    await pack.save();
    await pack.populate('challenges');
    res.json({ pack });
  } catch (err) { next(err); }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const pack = await Pack.findById(req.params.id);
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });
    if (pack.author?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'C\'est pas ton pack ça !' });
    }
    await Challenge.deleteMany({ pack: pack._id });
    await pack.deleteOne();
    res.json({ message: 'Pack supprimé.' });
  } catch (err) { next(err); }
});

module.exports = router;
