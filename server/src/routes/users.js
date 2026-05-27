const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const User = require('../models/User');
const GameHistory = require('../models/GameHistory');

router.get('/:id', protect, async (req, res, next) => {
  try {
    const isMe = req.user._id.toString() === req.params.id;
    // Si on regarde son propre profil, on renvoie tout. Sinon, profil PUBLIC
    // uniquement (pas l'email, pas la subscription Stripe, pas les achats).
    const projection = isMe ? undefined : 'username avatar tier role createdAt stats';
    let query = User.findById(req.params.id, projection);
    if (isMe) query = query.populate('customPacks');
    const user = await query;
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json({ user });
  } catch (err) { next(err); }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Té, c\'est pas ton profil !' });
    }
    const { username, avatar } = req.body;
    const updates = {};
    if (typeof username === 'string' && username.trim()) {
      updates.username = username.trim();
    }
    if (avatar !== undefined) {
      if (!req.user.isPremiumActive()) {
        return res.status(403).json({ message: 'Photo de profil réservée aux Premium.' });
      }
      updates.avatar = avatar;
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ user });
  } catch (err) { next(err); }
});

// Active ou désactive un cosmétique de l'utilisateur courant.
// Body: { category, slug } — slug=null pour repasser au défaut.
router.put('/me/active-skin', protect, async (req, res, next) => {
  try {
    const { category, slug } = req.body;
    if (!category) return res.status(400).json({ message: 'Catégorie requise.' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    // Les gatés peuvent activer n'importe quel cosmétique sans l'avoir acheté.
    // En mode lancement (FEATURES_UNLOCKED), tout le monde aussi.
    const featuresUnlocked = process.env.FEATURES_UNLOCKED === 'true';
    if (slug && !featuresUnlocked && user.role !== 'gate' && !user.purchasedSkins?.includes(slug)) {
      return res.status(403).json({ message: 'Tu ne possèdes pas ce cosmétique.' });
    }

    if (!user.activeSkins) user.activeSkins = new Map();
    if (slug) user.activeSkins.set(category, slug);
    else user.activeSkins.delete(category);

    await user.save();
    res.json({ user });
  } catch (err) { next(err); }
});

router.get('/:id/history', protect, async (req, res, next) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Té, c\'est pas ton historique !' });
    }
    const history = await GameHistory.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .populate('session');
    res.json({ history });
  } catch (err) { next(err); }
});

module.exports = router;
