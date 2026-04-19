const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const Pack = require('../models/Pack');
const Challenge = require('../models/Challenge');

// Packs officiels
router.get('/', async (req, res, next) => {
  try {
    const { theme } = req.query;
    const filter = theme ? { isOfficial: true, theme } : { isOfficial: true };
    const packs = await Pack.find(filter).populate('challenges');
    res.json({ packs });
  } catch (err) { next(err); }
});

// Import par shareCode (QR ou lien)
router.get('/share/:shareCode', async (req, res, next) => {
  try {
    const pack = await Pack.findOne({ shareCode: req.params.shareCode }).populate('challenges');
    if (!pack) return res.status(404).json({ message: 'Pack introuvable avec ce code.' });
    res.json({ pack });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const pack = await Pack.findById(req.params.id).populate('challenges');
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });
    res.json({ pack });
  } catch (err) { next(err); }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const { challenges: challengesData, ...packData } = req.body;
    if (!challengesData || challengesData.length !== 8) {
      return res.status(400).json({ message: 'Un pack doit contenir exactement 8 défis.' });
    }
    const pack = await Pack.create({ ...packData, author: req.user._id, isOfficial: false });
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
