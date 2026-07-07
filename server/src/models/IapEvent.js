const mongoose = require('mongoose');

// Idempotence des webhooks RevenueCat : on n'accorde les essais qu'une fois par event,
// même si RevenueCat retente l'envoi. TTL 30j (la fenêtre de retry est de quelques heures).
const iapEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: '30d' },
});

module.exports = mongoose.model('IapEvent', iapEventSchema);
