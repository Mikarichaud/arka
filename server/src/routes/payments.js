const express = require('express');
const router = express.Router();
const stripe = require('../services/stripe');
const User = require('../models/User');
const { protect } = require('../middlewares/auth');

const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  annual: process.env.STRIPE_PRICE_ANNUAL,
};

// Crée une session Stripe Checkout pour l'abonnement
router.post('/create-checkout-session', protect, async (req, res, next) => {
  try {
    const { billing = 'annual' } = req.body;
    const priceId = PRICES[billing];
    if (!priceId) return res.status(400).json({ message: 'Formule invalide.' });

    const user = req.user;
    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(user._id, {
        'subscription.stripeCustomerId': customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/premium`,
      subscription_data: {
        metadata: { userId: user._id.toString() },
      },
      allow_promotion_codes: true,
      locale: 'fr',
    });

    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// Portail client Stripe — gérer/annuler l'abonnement
router.post('/portal', protect, async (req, res, next) => {
  try {
    const customerId = req.user.subscription?.stripeCustomerId;
    if (!customerId) {
      return res.status(400).json({ message: 'Aucun abonnement actif trouvé.' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.CLIENT_URL}/profile`,
    });
    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// Statut abonnement courant
router.get('/subscription', protect, async (req, res) => {
  const user = req.user;
  res.json({
    tier: user.tier,
    status: user.subscription?.status || null,
    currentPeriodEnd: user.subscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd: Boolean(user.subscription?.cancelAtPeriodEnd),
    isPremiumActive: user.isPremiumActive(),
  });
});

// Webhook Stripe — utilise req.rawBody stocké par express.json({ verify })
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature invalide :', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          await activateSubscription(session.subscription, session.customer);
        } else if (session.mode === 'payment' && session.metadata?.kind === 'cosmetic') {
          await grantCosmetic(session.metadata.userId, session.metadata.cosmeticSlug);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await syncSubscription(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await cancelSubscription(sub.customer);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await User.findOneAndUpdate(
          { 'subscription.stripeCustomerId': invoice.customer },
          { 'subscription.status': 'past_due' }
        );
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Erreur traitement webhook :', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

function toDate(timestamp) {
  if (!timestamp) return null;
  const d = new Date(timestamp * 1000);
  return isNaN(d.getTime()) ? null : d;
}

// Depuis Stripe API 2025-08 (basil), current_period_end vit sur l'item.
// On garde fallbacks sur l'ancienne position + trial_end pour robustesse.
function getPeriodEnd(sub) {
  return (
    sub?.items?.data?.[0]?.current_period_end ??
    sub?.current_period_end ??
    sub?.trial_end ??
    null
  );
}

async function activateSubscription(subscriptionId, customerId) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await User.findOneAndUpdate(
    { 'subscription.stripeCustomerId': customerId },
    {
      tier: 'premium',
      'subscription.stripeSubscriptionId': sub.id,
      'subscription.status': sub.status,
      'subscription.currentPeriodEnd': toDate(getPeriodEnd(sub)),
      'subscription.cancelAtPeriodEnd': Boolean(sub.cancel_at_period_end),
    }
  );
}

async function syncSubscription(sub) {
  // past_due et unpaid = fenêtre de retry Stripe, on garde le tier premium.
  // Seuls canceled / incomplete_expired / incomplete démotent vers free.
  const keepsPremium =
    sub.status === 'active' ||
    sub.status === 'trialing' ||
    sub.status === 'past_due' ||
    sub.status === 'unpaid';
  await User.findOneAndUpdate(
    { 'subscription.stripeCustomerId': sub.customer },
    {
      tier: keepsPremium ? 'premium' : 'free',
      'subscription.stripeSubscriptionId': sub.id,
      'subscription.status': sub.status,
      'subscription.currentPeriodEnd': toDate(getPeriodEnd(sub)),
      'subscription.cancelAtPeriodEnd': Boolean(sub.cancel_at_period_end),
    }
  );
}

async function grantCosmetic(userId, slug) {
  if (!userId || !slug) return;
  await User.updateOne(
    { _id: userId },
    { $addToSet: { purchasedSkins: slug } }
  );
}

async function cancelSubscription(customerId) {
  await User.findOneAndUpdate(
    { 'subscription.stripeCustomerId': customerId },
    {
      tier: 'free',
      'subscription.status': 'canceled',
      'subscription.stripeSubscriptionId': null,
      'subscription.currentPeriodEnd': null,
      'subscription.cancelAtPeriodEnd': false,
    }
  );
}

module.exports = router;
