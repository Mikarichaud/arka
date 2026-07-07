const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const User = require('../models/User');
const GameHistory = require('../models/GameHistory');
const Pack = require('../models/Pack');
const Challenge = require('../models/Challenge');
const Session = require('../models/Session');
const Salon = require('../models/Salon');
const Certificate = require('../models/Certificate');
const QuizAttempt = require('../models/QuizAttempt');
const stripe = require('../services/stripe');

const USERNAME_REGEX = /^[a-zA-Z0-9_\-.]{3,30}$/;
const POSTAL_CODE_REGEX = /^\d{5}$/;

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
    const { username, avatar, postalCode } = req.body;
    const updates = {};
    if (postalCode !== undefined) {
      if (postalCode === null || postalCode === '') {
        updates.postalCode = null; // permet d'effacer
      } else if (typeof postalCode !== 'string' || !POSTAL_CODE_REGEX.test(postalCode.trim())) {
        return res.status(400).json({ message: 'Code postal : 5 chiffres, té.' });
      } else {
        updates.postalCode = postalCode.trim();
      }
    }
    if (username !== undefined) {
      if (typeof username !== 'string' || !USERNAME_REGEX.test(username.trim())) {
        return res.status(400).json({ message: 'Pseudo : 3 à 30 caractères, lettres/chiffres/_/-/.' });
      }
      const trimmed = username.trim();
      // Vérifie l'unicité (hors soi-même) avant l'update pour un message clair
      const taken = await User.findOne({ username: trimmed, _id: { $ne: req.params.id } });
      if (taken) {
        return res.status(409).json({ message: 'Ce pseudo est déjà pris, té !', code: 'USERNAME_TAKEN' });
      }
      updates.username = trimmed;
    }
    if (avatar !== undefined) {
      if (!req.user.isPremiumActive()) {
        return res.status(403).json({ message: 'Photo de profil réservée aux Premium.' });
      }
      updates.avatar = avatar;
    }
    try {
      const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
      res.json({ user });
    } catch (e) {
      // Filet de sécurité : course possible sur l'index unique
      if (e.code === 11000) {
        return res.status(409).json({ message: 'Ce pseudo est déjà pris, té !', code: 'USERNAME_TAKEN' });
      }
      throw e;
    }
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

// Suppression de compte (RGPD + exigence App Store). Suppression dure + nettoyage :
// abo Stripe annulé, packs persos + défis supprimés, sessions/galeries supprimées,
// salons hébergés fermés, entrées joueur déliées (userId=null) dans les autres salons.
// Les pseudos déjà dénormalisés dans l'historique des soirées restent (pas de PII).
router.delete('/me', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Annule l'abonnement Stripe si actif (best-effort : peut déjà être annulé/introuvable).
    const subId = req.user.subscription?.stripeSubscriptionId;
    if (subId) {
      try { await stripe.subscriptions.cancel(subId); } catch (e) { /* ignore */ }
    }

    // 2. Packs persos + leurs défis.
    const packs = await Pack.find({ author: userId }).select('_id');
    const packIds = packs.map((p) => p._id);
    if (packIds.length) {
      await Challenge.deleteMany({ pack: { $in: packIds } });
      await Pack.deleteMany({ _id: { $in: packIds } });
    }

    // 3. Sessions/galeries de l'user + historique legacy.
    await Session.deleteMany({ createdBy: userId });
    await GameHistory.deleteMany({ user: userId });

    // 4. Salons : ferme ceux qu'il héberge, délie ses entrées joueur ailleurs.
    await Salon.updateMany(
      { hostUserId: userId, status: { $ne: 'ended' } },
      { $set: { status: 'ended' } }
    );
    await Salon.updateMany(
      { 'players.userId': userId },
      { $set: { 'players.$[p].userId': null } },
      { arrayFilters: [{ 'p.userId': userId }] }
    );

    // 5. Passeport Marseillais : certificat + tentatives.
    await Certificate.deleteOne({ userId });
    await QuizAttempt.deleteMany({ userId });

    // 6. Le compte lui-même.
    await User.findByIdAndDelete(userId);

    res.json({ ok: true, message: 'Compte supprimé. Adieu, té !' });
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
