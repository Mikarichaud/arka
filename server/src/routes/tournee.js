const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const TourneeSpot = require('../models/TourneeSpot');

const FIELD_BY_TYPE = { scan: 'scans', app: 'appClicks' };
const PUBLIC_BASE = 'https://roulademarseillaise.fr';

// Enregistre un événement (scan / clic app) — uniquement si le spot existe vraiment.
// L'inscription réelle est comptée côté authController (register). Public.
router.post('/event', async (req, res, next) => {
  try {
    const { spot, type } = req.body || {};
    const field = FIELD_BY_TYPE[type];
    if (!spot || !field) return res.json({ ok: true, ignored: true });
    const r = await TourneeSpot.updateOne({ spot }, { $inc: { [field]: 1 } });
    res.json({ ok: true, counted: r.matchedCount > 0 });
  } catch (err) { next(err); }
});

// QR code PNG d'un spot, généré à la demande (pour Canva). Public (encode juste une URL publique).
// ?transparent=1 → fond transparent (sinon carré fond blanc).
router.get('/:spot/qr.png', async (req, res, next) => {
  try {
    const { spot } = req.params;
    if (!(await TourneeSpot.exists({ spot }))) return res.status(404).send('Spot introuvable');
    const isTrue = (v) => v === '1' || v === 'true';
    const transparent = isTrue(req.query.transparent); // fond transparent (sinon carré blanc)
    const whiteModules = isTrue(req.query.white);       // modules blancs (pour support FONCÉ)
    const png = await QRCode.toBuffer(`${PUBLIC_BASE}/tournee?spot=${spot}`, {
      width: 2000,
      margin: 2,
      color: {
        dark: whiteModules ? '#FFFFFF' : '#0D1117',
        light: transparent ? '#00000000' : '#FFFFFF',
      },
    });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store'); // pas de cache → toujours la version à jour
    if (req.query.download) {
      const suffix = transparent ? (whiteModules ? '-transparent-blanc' : '-transparent') : '';
      res.set('Content-Disposition', `attachment; filename="qr-${spot}${suffix}.png"`);
    }
    res.send(png);
  } catch (err) { next(err); }
});

module.exports = router;
