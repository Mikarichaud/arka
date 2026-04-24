const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const packRoutes = require('./routes/packs');
const sessionRoutes = require('./routes/sessions');
const mediaRoutes = require('./routes/media');
const paymentRoutes = require('./routes/payments');

const app = express();

app.use(helmet());

const corsOptions = process.env.NODE_ENV === 'production'
  ? { origin: process.env.CLIENT_URL, credentials: true }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
app.use(morgan('dev'));

// Webhook Stripe : body brut obligatoire pour la vérification de signature
// Toutes les autres routes : JSON parsé
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: "C'est bon, on est entre nous." });
});

app.use(errorHandler);

module.exports = app;
