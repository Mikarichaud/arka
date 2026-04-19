const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const Session = require('../models/Session');
const Pack = require('../models/Pack');

router.post('/', async (req, res, next) => {
  try {
    const { players, packId, history = [] } = req.body;
    if (!players || players.length < 2) {
      return res.status(400).json({ message: 'Il faut au moins 2 joueurs, oh fada !' });
    }
    const pack = await Pack.findById(packId);
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });

    const sessionData = {
      players: players.map((p) => ({
        name: typeof p === 'string' ? p : p.name,
        score: typeof p === 'object' ? (p.score || 0) : 0,
      })),
      pack: packId,
      status: 'finished',
      history: history.map((h) => ({
        playerName: h.playerName,
        challengeText: h.challengeText || '',
        result: h.result || 'pending',
        points: h.points || 0,
        media: h.media || [],
      })),
    };

    if (req.headers.authorization) {
      const jwt = require('jsonwebtoken');
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        sessionData.createdBy = decoded.id;
      } catch {}
    }

    const session = await Session.create(sessionData);
    res.status(201).json({ session, shareLink: session.shareLink });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate({ path: 'pack', populate: { path: 'challenges' } });
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

// Galerie publique — accessible sans auth via shareLink
router.get('/gallery/:shareLink', async (req, res, next) => {
  try {
    const session = await Session.findOne({ shareLink: req.params.shareLink });
    if (!session) return res.status(404).json({ message: 'Galerie introuvable.' });

    const media = session.history
      .filter((h) => h.media && h.media.length > 0)
      .flatMap((h) => h.media.map((url) => ({
        url,
        playerName: h.playerName,
        challengeText: h.challengeText,
        result: h.result,
      })));

    res.json({
      shareLink: session.shareLink,
      players: session.players,
      packId: session.pack,
      media,
      createdAt: session.createdAt,
    });
  } catch (err) { next(err); }
});

// Historique des sessions d'un utilisateur connecté
router.get('/user/me', protect, async (req, res, next) => {
  try {
    const sessions = await Session.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate('pack', 'name theme')
      .select('players pack shareLink createdAt status history');
    res.json({ sessions });
  } catch (err) { next(err); }
});

module.exports = router;
