const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middlewares/auth');
const Pack = require('../models/Pack');
const Challenge = require('../models/Challenge');

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

// Packs officiels (liste) — ne retourne jamais les challenges en mode liste
// Ajoute accessible:true/false si l'utilisateur est identifié
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { theme } = req.query;
    const filter = theme ? { isOfficial: true, theme } : { isOfficial: true };
    const packs = await Pack.find(filter).select('-challenges');
    const result = packs.map((p) => {
      const obj = p.toObject();
      obj.accessible = hasPackAccess(req.user, p);
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

// Créer un pack custom
router.post('/', protect, async (req, res, next) => {
  try {
    const { challenges: challengesData, ...packData } = req.body;
    if (!challengesData || challengesData.length < 8 || challengesData.length > 24) {
      return res.status(400).json({ message: 'Un pack doit contenir entre 8 et 24 défis.' });
    }
    const pack = await Pack.create({ ...packData, author: req.user._id, isOfficial: false, isPremium: false });
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
    const pack = await Pack.findById(req.params.id);
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });
    if (pack.author?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'C\'est pas ton pack ça !' });
    }
    const updated = await Pack.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ pack: updated });
  } catch (err) { next(err); }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const pack = await Pack.findById(req.params.id);
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });
    if (pack.author?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'C\'est pas ton pack ça !' });
    }
    await pack.deleteOne();
    res.json({ message: 'Pack supprimé.' });
  } catch (err) { next(err); }
});

module.exports = router;
