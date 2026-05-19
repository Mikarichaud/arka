const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Hé bé, tu t\'es pas connecté !' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur introuvable.' });
    }
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide, oh fada !' });
  }
};

// Identifie l'utilisateur si un token est fourni, mais ne bloque pas si absent
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
  } catch {
    // token invalide → on continue sans user
  }
  next();
};

const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Hé bé, tu t\'es pas connecté !' });
  }
  if (!req.user.isPremiumActive()) {
    return res.status(403).json({ message: 'Ce contenu est réservé aux membres Premium.', code: 'PREMIUM_REQUIRED' });
  }
  next();
};

const requireGate = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Hé bé, tu t\'es pas connecté !' });
  }
  if (req.user.role !== 'gate') {
    return res.status(403).json({ message: 'Espace réservé aux Gatés du site.', code: 'GATE_REQUIRED' });
  }
  next();
};

// Vérifie qu'on est bien membre actif d'un salon (via connectionToken).
// Attache req.salon et req.salonPlayer pour les handlers.
// Le code du salon vient de req.params.code, le token de req.headers['x-salon-token'] ou req.body.connectionToken.
const Salon = require('../models/Salon');
const requireSalonMember = async (req, res, next) => {
  try {
    const code = (req.params.code || '').toUpperCase();
    const token = req.headers['x-salon-token'] || req.body?.connectionToken;
    if (!code || !token) {
      return res.status(401).json({ message: 'Authentification salon manquante.' });
    }
    const salon = await Salon.findOne({ code });
    if (!salon) return res.status(404).json({ message: 'Salon introuvable.' });
    if (salon.status === 'ended') {
      return res.status(410).json({ message: 'Ce salon est fermé.', code: 'SALON_ENDED' });
    }
    const player = salon.findPlayerByToken(token);
    if (!player) {
      return res.status(403).json({ message: 'Pas membre de ce salon.', code: 'NOT_MEMBER' });
    }
    req.salon = salon;
    req.salonPlayer = player;
    next();
  } catch (err) { next(err); }
};

module.exports = { protect, optionalAuth, requirePremium, requireGate, requireSalonMember };
