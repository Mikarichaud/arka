const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const Session = require('../models/Session');
const Pack = require('../models/Pack');

router.post('/', protect, async (req, res, next) => {
  try {
    const { players, packId } = req.body;
    if (!players || players.length < 2) {
      return res.status(400).json({ message: 'Il faut au moins 2 joueurs, oh fada !' });
    }
    const pack = await Pack.findById(packId).populate('challenges');
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });

    const session = await Session.create({
      players: players.map((name) => ({ name })),
      pack: packId,
      createdBy: req.user._id,
      status: 'playing',
    });
    res.status(201).json({ session, pack });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id).populate({ path: 'pack', populate: { path: 'challenges' } });
    if (!session) return res.status(404).json({ message: 'Session introuvable.' });
    res.json({ session });
  } catch (err) { next(err); }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ session });
  } catch (err) { next(err); }
});

// Résultat du spin : index de case aléatoire 0-7
router.post('/:id/spin', protect, async (req, res, next) => {
  try {
    const spinResult = Math.floor(Math.random() * 8);
    const session = await Session.findByIdAndUpdate(
      req.params.id,
      { currentSpinResult: spinResult },
      { new: true }
    ).populate({ path: 'pack', populate: { path: 'challenges' } });
    const challenge = session.pack.challenges[spinResult];
    res.json({ spinResult, challenge });
  } catch (err) { next(err); }
});

// Vote sur un défi
router.post('/:id/vote', protect, async (req, res, next) => {
  try {
    const { result, historyEntryIndex } = req.body;
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session introuvable.' });

    session.history[historyEntryIndex].result = result;

    // Mise à jour du score si défi complété
    if (result === 'completed') {
      const challenge = await require('../models/Challenge').findById(
        session.history[historyEntryIndex].challenge
      );
      const playerName = session.history[historyEntryIndex].playerName;
      const playerIndex = session.players.findIndex((p) => p.name === playerName);
      if (playerIndex !== -1 && challenge) {
        session.players[playerIndex].score += challenge.intensity.level;
      }
    }

    // Passer au joueur suivant
    session.currentPlayerIndex = (session.currentPlayerIndex + 1) % session.players.length;
    await session.save();
    res.json({ session });
  } catch (err) { next(err); }
});

// Galerie publique de la session
router.get('/:id/gallery', async (req, res, next) => {
  try {
    const session = await Session.findOne({ shareLink: req.params.id });
    if (!session) return res.status(404).json({ message: 'Galerie introuvable.' });
    const medias = session.history.flatMap((h) => h.media);
    res.json({ medias, players: session.players });
  } catch (err) { next(err); }
});

module.exports = router;
