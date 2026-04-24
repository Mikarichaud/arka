const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY manquante dans .env');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
