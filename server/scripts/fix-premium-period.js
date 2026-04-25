require('dotenv').config();
const mongoose = require('mongoose');
const stripe = require('../src/services/stripe');
const User = require('../src/models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({ 'subscription.stripeSubscriptionId': { $ne: null } });
  for (const u of users) {
    const sub = await stripe.subscriptions.retrieve(u.subscription.stripeSubscriptionId);
    const item = sub.items?.data?.[0];
    const periodEnd =
      item?.current_period_end ??
      sub.current_period_end ??
      sub.trial_end ??
      null;
    const end = periodEnd ? new Date(periodEnd * 1000) : null;
    console.log(`${u.username} — status=${sub.status} periodEnd=${end}`);
    u.subscription.currentPeriodEnd = end;
    u.subscription.status = sub.status;
    await u.save();
  }
  await mongoose.disconnect();
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
