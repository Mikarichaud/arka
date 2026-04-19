const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const User = require('../models/User');
const GameHistory = require('../models/GameHistory');

router.get('/:id', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('customPacks');
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
    const user = await User.findByIdAndUpdate(req.params.id, { username, avatar }, { new: true });
    res.json({ user });
  } catch (err) { next(err); }
});

router.get('/:id/history', protect, async (req, res, next) => {
  try {
    const history = await GameHistory.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .populate('session');
    res.json({ history });
  } catch (err) { next(err); }
});

module.exports = router;
