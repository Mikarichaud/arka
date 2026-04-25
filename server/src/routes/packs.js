const express = require('express');
const { nanoid } = require('nanoid');
const router = express.Router();
const { protect, optionalAuth } = require('../middlewares/auth');
const Pack = require('../models/Pack');
const Challenge = require('../models/Challenge');

const FREE_PACK_LIMIT = 1;
const FREE_CHALLENGES_COUNT = 8;
const PREMIUM_CHALLENGES_MIN = 8;
const PREMIUM_CHALLENGES_MAX = 24;
const PREMIUM_THEMES = ['marseillais', 'amis', 'sportif', 'couple', 'enfants', 'custom'];

function hasPackAccess(user, pack) {
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
    const filter = { $or: orClauses };
    if (theme) filter.theme = theme;

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

    // Thème : Premium choisit, Free est forcé à "custom"
    const finalTheme = isPremium && PREMIUM_THEMES.includes(theme) ? theme : 'custom';

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
      pack.theme = isPremium && PREMIUM_THEMES.includes(theme) ? theme : 'custom';
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
