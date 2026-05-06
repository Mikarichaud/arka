const express = require('express');
const { nanoid } = require('nanoid');
const router = express.Router();
const { protect, requireGate } = require('../middlewares/auth');
const Pack = require('../models/Pack');
const Challenge = require('../models/Challenge');
const Category = require('../models/Category');
const Cosmetic = require('../models/Cosmetic');
const stripe = require('../services/stripe');

const MIN_CHALLENGES = 8;
const MAX_CHALLENGES = 24;

// Toutes les routes ici sont réservées aux Gatés.
router.use(protect, requireGate);

async function resolveTheme(theme) {
  if (!theme) return 'custom';
  const cat = await Category.findOne({ slug: theme });
  return cat ? cat.slug : 'custom';
}

// ─────────── CATÉGORIES (CRUD) ───────────

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ order: 1, name: 1 });
    res.json({ categories });
  } catch (err) { next(err); }
});

router.post('/categories', async (req, res, next) => {
  try {
    const { name, slug, icon, order } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Nom requis.' });
    const finalSlug = slug?.trim() || Category.slugify(name);
    const exists = await Category.findOne({ slug: finalSlug });
    if (exists) return res.status(409).json({ message: 'Une catégorie avec ce slug existe déjà.' });
    const cat = await Category.create({
      name: name.trim(),
      slug: finalSlug,
      icon: icon || 'wheel',
      order: order ?? 0,
    });
    res.status(201).json({ category: cat });
  } catch (err) { next(err); }
});

router.put('/categories/:id', async (req, res, next) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Catégorie introuvable.' });
    const { name, slug, icon, order } = req.body;
    const previousSlug = cat.slug;
    if (name !== undefined) cat.name = name.trim();
    if (slug !== undefined && slug.trim() && slug !== previousSlug) {
      const conflict = await Category.findOne({ slug: slug.trim(), _id: { $ne: cat._id } });
      if (conflict) return res.status(409).json({ message: 'Slug déjà pris.' });
      cat.slug = slug.trim();
    }
    if (icon !== undefined) cat.icon = icon;
    if (order !== undefined) cat.order = order;
    await cat.save();
    // Cascade : si le slug a changé, repercute sur tous les packs qui l'utilisaient
    if (cat.slug !== previousSlug) {
      await Pack.updateMany({ theme: previousSlug }, { theme: cat.slug });
    }
    res.json({ category: cat });
  } catch (err) { next(err); }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: 'Catégorie introuvable.' });
    if (cat.slug === 'custom') {
      return res.status(400).json({ message: 'La catégorie "custom" ne peut pas être supprimée.' });
    }
    const usedBy = await Pack.countDocuments({ theme: cat.slug });
    if (usedBy > 0) {
      return res.status(409).json({
        message: `${usedBy} pack(s) utilisent cette catégorie. Réassigne-les avant de supprimer.`,
        code: 'CATEGORY_IN_USE',
      });
    }
    await cat.deleteOne();
    res.json({ message: 'Catégorie supprimée.' });
  } catch (err) { next(err); }
});

// ─────────── COSMÉTIQUES ───────────

// Helper : crée ou met à jour le Stripe Product + Price d'un cosmétique
async function syncStripeForCosmetic(cosmetic) {
  // Crée le produit s'il n'existe pas
  if (!cosmetic.stripeProductId) {
    const product = await stripe.products.create({
      name: cosmetic.name,
      description: cosmetic.description || undefined,
      metadata: { slug: cosmetic.slug, category: cosmetic.category },
    });
    cosmetic.stripeProductId = product.id;
  } else {
    // Met à jour le nom/description Stripe si changement
    await stripe.products.update(cosmetic.stripeProductId, {
      name: cosmetic.name,
      description: cosmetic.description || undefined,
    });
  }

  // Stripe ne permet pas de modifier un Price : on en crée un nouveau si le montant change
  let needNewPrice = !cosmetic.stripePriceId;
  if (cosmetic.stripePriceId) {
    try {
      const existing = await stripe.prices.retrieve(cosmetic.stripePriceId);
      if (existing.unit_amount !== cosmetic.priceCents || !existing.active) {
        needNewPrice = true;
        // Désactive l'ancien
        await stripe.prices.update(cosmetic.stripePriceId, { active: false });
      }
    } catch {
      needNewPrice = true;
    }
  }

  if (needNewPrice) {
    const price = await stripe.prices.create({
      product: cosmetic.stripeProductId,
      unit_amount: cosmetic.priceCents,
      currency: 'eur',
    });
    cosmetic.stripePriceId = price.id;
  }
}

router.get('/cosmetics', async (req, res, next) => {
  try {
    const cosmetics = await Cosmetic.find({}).sort({ category: 1, priceCents: 1, createdAt: -1 });
    res.json({ cosmetics });
  } catch (err) { next(err); }
});

router.post('/cosmetics', async (req, res, next) => {
  try {
    const { slug, category, name, description, priceCents, asset, isActive, publishAt } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Nom requis.' });
    if (!Cosmetic.CATEGORIES.includes(category)) return res.status(400).json({ message: 'Catégorie invalide.' });
    if (!Number.isInteger(priceCents) || priceCents < 0) return res.status(400).json({ message: 'Prix invalide.' });

    const finalSlug = slug?.trim() || Cosmetic.slugify(name);
    const exists = await Cosmetic.findOne({ slug: finalSlug });
    if (exists) return res.status(409).json({ message: 'Slug déjà pris.' });

    const cosmetic = new Cosmetic({
      slug: finalSlug,
      category,
      name: name.trim(),
      description: description?.trim() || '',
      priceCents,
      asset: asset || {},
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      publishAt: publishAt ? new Date(publishAt) : null,
    });

    await syncStripeForCosmetic(cosmetic);
    await cosmetic.save();
    res.status(201).json({ cosmetic });
  } catch (err) { next(err); }
});

router.put('/cosmetics/:id', async (req, res, next) => {
  try {
    const cosmetic = await Cosmetic.findById(req.params.id);
    if (!cosmetic) return res.status(404).json({ message: 'Cosmétique introuvable.' });

    const { name, description, priceCents, asset, isActive, publishAt, category } = req.body;
    if (name !== undefined) cosmetic.name = name.trim();
    if (description !== undefined) cosmetic.description = description?.trim() || '';
    if (category !== undefined && Cosmetic.CATEGORIES.includes(category)) cosmetic.category = category;
    if (priceCents !== undefined) {
      if (!Number.isInteger(priceCents) || priceCents < 0) return res.status(400).json({ message: 'Prix invalide.' });
      cosmetic.priceCents = priceCents;
    }
    if (asset !== undefined) cosmetic.asset = asset;
    if (isActive !== undefined) cosmetic.isActive = Boolean(isActive);
    if (publishAt !== undefined) cosmetic.publishAt = publishAt ? new Date(publishAt) : null;

    await syncStripeForCosmetic(cosmetic);
    await cosmetic.save();
    res.json({ cosmetic });
  } catch (err) { next(err); }
});

router.delete('/cosmetics/:id', async (req, res, next) => {
  try {
    const cosmetic = await Cosmetic.findById(req.params.id);
    if (!cosmetic) return res.status(404).json({ message: 'Cosmétique introuvable.' });
    // On désactive plutôt que supprimer définitivement, pour ne pas casser les utilisateurs qui possèdent déjà le skin.
    cosmetic.isActive = false;
    if (cosmetic.stripePriceId) {
      try { await stripe.prices.update(cosmetic.stripePriceId, { active: false }); } catch {}
    }
    if (cosmetic.stripeProductId) {
      try { await stripe.products.update(cosmetic.stripeProductId, { active: false }); } catch {}
    }
    await cosmetic.save();
    res.json({ message: 'Cosmétique désactivé (les utilisateurs qui le possèdent gardent l\'accès).' });
  } catch (err) { next(err); }
});

// ─────────── PACKS OFFICIELS ───────────

// Lister tous les packs officiels
router.get('/packs', async (req, res, next) => {
  try {
    const packs = await Pack.find({ isOfficial: true }).sort({ isPremium: 1, createdAt: -1 });
    res.json({ packs });
  } catch (err) { next(err); }
});

// Récupérer un pack officiel complet (avec ses défis)
router.get('/packs/:id', async (req, res, next) => {
  try {
    const pack = await Pack.findById(req.params.id).populate('challenges');
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });
    if (!pack.isOfficial) return res.status(403).json({ message: 'Ce pack n\'est pas officiel.' });
    res.json({ pack });
  } catch (err) { next(err); }
});

// Créer un pack officiel
router.post('/packs', async (req, res, next) => {
  try {
    const { name, description, theme, isPremium, coverImage, challenges: challengesData, isActive, publishAt } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'Il faut un nom au pack.' });
    }
    if (!Array.isArray(challengesData) || challengesData.length < MIN_CHALLENGES || challengesData.length > MAX_CHALLENGES) {
      return res.status(400).json({ message: `Un pack officiel doit contenir entre ${MIN_CHALLENGES} et ${MAX_CHALLENGES} défis.` });
    }

    const pack = await Pack.create({
      name: name.trim(),
      description: description?.trim() || '',
      theme: await resolveTheme(theme),
      isOfficial: true,
      isPremium: Boolean(isPremium),
      isPublic: true,
      shareCode: nanoid(8).toUpperCase(),
      coverImage: coverImage || null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      publishAt: publishAt ? new Date(publishAt) : null,
    });

    const challenges = await Challenge.insertMany(
      challengesData.map((c) => ({ ...c, pack: pack._id }))
    );
    pack.challenges = challenges.map((c) => c._id);
    await pack.save();
    await pack.populate('challenges');
    res.status(201).json({ pack });
  } catch (err) { next(err); }
});

// Éditer un pack officiel
router.put('/packs/:id', async (req, res, next) => {
  try {
    const pack = await Pack.findById(req.params.id);
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });
    if (!pack.isOfficial) return res.status(403).json({ message: 'Ce pack n\'est pas officiel.' });

    const { name, description, theme, isPremium, coverImage, challenges: challengesData, isActive, publishAt } = req.body;

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Il faut un nom au pack.' });
      pack.name = name.trim();
    }
    if (description !== undefined) pack.description = description?.trim() || '';
    if (theme !== undefined) pack.theme = await resolveTheme(theme);
    if (isPremium !== undefined) pack.isPremium = Boolean(isPremium);
    if (coverImage !== undefined) pack.coverImage = coverImage || null;
    if (isActive !== undefined) pack.isActive = Boolean(isActive);
    if (publishAt !== undefined) pack.publishAt = publishAt ? new Date(publishAt) : null;

    if (Array.isArray(challengesData)) {
      if (challengesData.length < MIN_CHALLENGES || challengesData.length > MAX_CHALLENGES) {
        return res.status(400).json({ message: `Un pack officiel doit contenir entre ${MIN_CHALLENGES} et ${MAX_CHALLENGES} défis.` });
      }
      await Challenge.deleteMany({ pack: pack._id });
      const challenges = await Challenge.insertMany(
        challengesData.map((c) => ({ ...c, pack: pack._id }))
      );
      pack.challenges = challenges.map((c) => c._id);
    }

    await pack.save();
    await pack.populate('challenges');
    res.json({ pack });
  } catch (err) { next(err); }
});

// Supprimer un pack officiel
router.delete('/packs/:id', async (req, res, next) => {
  try {
    const pack = await Pack.findById(req.params.id);
    if (!pack) return res.status(404).json({ message: 'Pack introuvable.' });
    if (!pack.isOfficial) return res.status(403).json({ message: 'Ce pack n\'est pas officiel.' });
    await Challenge.deleteMany({ pack: pack._id });
    await pack.deleteOne();
    res.json({ message: 'Pack supprimé.' });
  } catch (err) { next(err); }
});

module.exports = router;
