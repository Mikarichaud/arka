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

module.exports = { protect, optionalAuth, requirePremium };
