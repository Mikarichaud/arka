const express = require('express');
const router = express.Router();
const stripe = require('../services/stripe');
const Cosmetic = require('../models/Cosmetic');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middlewares/auth');

// Liste publique du shop : cosmétiques actifs, publishAt passé.
// Si user connecté → flag owned=true sur ceux qu'il possède.
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const now = new Date();
    const filter = {
      isActive: { $ne: false },
      $or: [{ publishAt: null }, { publishAt: { $lte: now } }],
    };
    const cosmetics = await Cosmetic.find(filter).sort({ category: 1, priceCents: 1 });
    const isGate = req.user?.role === 'gate';
    const owned = new Set(req.user?.purchasedSkins || []);
    const result = cosmetics.map((c) => {
      const obj = c.toObject();
      // Les gatés possèdent automatiquement tous les cosmétiques
      obj.owned = isGate || owned.has(c.slug);
      return obj;
    });
    res.json({ cosmetics: result });
  } catch (err) { next(err); }
});

// Lance un Stripe Checkout pour acheter un cosmétique unitaire.
router.post('/:slug/checkout', protect, async (req, res, next) => {
  try {
    const cosmetic = await Cosmetic.findOne({ slug: req.params.slug });
    if (!cosmetic) return res.status(404).json({ message: 'Cosmétique introuvable.' });
    if (!cosmetic.stripePriceId) return res.status(400).json({ message: 'Cosmétique non publiable (Stripe manquant).' });

    const now = new Date();
    if (!cosmetic.isActive || (cosmetic.publishAt && cosmetic.publishAt > now)) {
      return res.status(400).json({ message: 'Ce cosmétique n\'est pas en vente.' });
    }

    if (req.user.role === 'gate' || req.user.purchasedSkins?.includes(cosmetic.slug)) {
      return res.status(400).json({ message: 'Tu as déjà ce cosmétique.', code: 'ALREADY_OWNED' });
    }

    let customerId = req.user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.username,
        metadata: { userId: req.user._id.toString() },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(req.user._id, { 'subscription.stripeCustomerId': customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: cosmetic.stripePriceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/packs?tab=cosmetics&purchased=${cosmetic.slug}`,
      cancel_url: `${process.env.CLIENT_URL}/packs?tab=cosmetics`,
      metadata: {
        userId: req.user._id.toString(),
        cosmeticSlug: cosmetic.slug,
        kind: 'cosmetic',
      },
      locale: 'fr',
    });

    res.json({ url: session.url });
  } catch (err) { next(err); }
});

module.exports = router;
