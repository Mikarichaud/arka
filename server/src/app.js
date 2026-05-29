const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const packRoutes = require('./routes/packs');
const sessionRoutes = require('./routes/sessions');
const mediaRoutes = require('./routes/media');
const paymentRoutes = require('./routes/payments');
const gateRoutes = require('./routes/gate');
const categoryRoutes = require('./routes/categories');
const cosmeticRoutes = require('./routes/cosmetics');
const salonRoutes = require('./routes/salons');
const sitemapRoute = require('./routes/sitemap');
const adminRoutes = require('./routes/admin');

const app = express();

// On tourne derrière Nginx en prod : il faut faire confiance à X-Forwarded-For
// sinon req.ip = IP de Nginx pour tous les clients (rate-limit cassé).
app.set('trust proxy', 1);

app.use(helmet());

// Origines autorisées en prod : le site web (CLIENT_URL) + les origines des apps
// natives Capacitor (iOS = capacitor://localhost, Android = http://localhost).
const PROD_ORIGINS = [
  process.env.CLIENT_URL,
  'capacitor://localhost',
  'http://localhost',
].filter(Boolean);

const corsOptions = process.env.NODE_ENV === 'production'
  ? { origin: PROD_ORIGINS, credentials: true }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
// En prod : format combined (1 ligne par requête, parsable par fail2ban/grafana).
// En dev : format dev (couleurs).
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

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

// Rate limiters — appliqués AVANT les routes concernées.
// Webhook Stripe exempté de tout limiter (Stripe peut retry en burst).
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.originalUrl === '/api/payments/webhook',
  message: { message: 'Té, doucement avec les requêtes !' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion. Attends 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop d\'inscriptions depuis cette adresse. Reviens dans une heure.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop d\'uploads, calme-toi une minute !' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de demandes de reset. Attends une heure.' },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Attends une heure.' },
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/reset-password', resetPasswordLimiter);
app.use('/api/auth/change-password', resetPasswordLimiter);
app.use('/api/auth/change-email', resetPasswordLimiter);
app.use('/api/media/upload', uploadLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cosmetics', cosmeticRoutes);
app.use('/api/salons', salonRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: "C'est bon, on est entre nous." });
});

// Sitemap SEO — exposé sur /sitemap.xml directement (pas sous /api)
app.use('/', sitemapRoute);

app.use(errorHandler);

module.exports = app;
