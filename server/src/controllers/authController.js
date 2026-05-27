const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendPasswordReset } = require('../services/email');

// Default short-lived (1 jour) — token volé = exposition courte.
// Override via JWT_EXPIRES_IN si besoin (ex: '7d' pour dev).
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_\-.]{3,30}$/;

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Oh fada, remplis tous les champs !' });
    }
    if (typeof username !== 'string' || !USERNAME_REGEX.test(username.trim())) {
      return res.status(400).json({ message: 'Pseudo : 3 à 30 caractères, lettres/chiffres/_/-/.' });
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: 'Email pas valide, hé bé.' });
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
      return res.status(400).json({ message: 'Mot de passe : 6 à 100 caractères.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();
    const existing = await User.findOne({ $or: [{ email: normalizedEmail }, { username: trimmedUsername }] });
    if (existing) {
      return res.status(409).json({ message: 'Ce pseudo ou email est déjà pris, té !' });
    }
    const user = await User.create({ username: trimmedUsername, email: normalizedEmail, password });
    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { login: identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Oh fada, remplis tous les champs !' });
    }
    const isEmail = identifier.includes('@');
    const user = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { username: identifier }
    ).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
    }
    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

function hashResetToken(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

// POST /api/auth/forgot-password { email }
// Toujours 200 (anti-enumeration). En coulisses : génère un token cryptographique,
// stocke son hash + expiry sur le user, envoie le mail. Si l'email n'existe pas
// ou si le mail échoue, on ne le dit pas au client.
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const ack = { ok: true, message: 'Si t\'es bien chez nous, t\'as un mail dans la boîte. Va voir, té !' };
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.json(ack); // pas la peine de divulguer la raison
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.json(ack);

    const plainToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
    user.passwordResetTokenHash = hashResetToken(plainToken);
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const base = (process.env.CLIENT_URL || '').replace(/\/$/, '') || 'http://localhost:5177';
    const resetUrl = `${base}/login/reset?token=${plainToken}`;

    try {
      await sendPasswordReset({ to: user.email, pseudo: user.username, resetUrl });
    } catch (err) {
      // On log l'erreur mais on garde la réponse identique (anti-enumeration via timing/error).
      console.error('sendPasswordReset failed', err);
    }
    res.json(ack);
  } catch (err) { next(err); }
};

// POST /api/auth/reset-password { token, password }
// Vérifie le hash du token + expiry, change le password, invalide le token.
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ message: 'Lien invalide ou expiré.', code: 'BAD_TOKEN' });
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
      return res.status(400).json({ message: 'Mot de passe : 6 à 100 caractères.' });
    }
    const tokenHash = hashResetToken(token.trim());
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');
    if (!user) {
      return res.status(400).json({ message: 'Lien invalide ou expiré.', code: 'BAD_TOKEN' });
    }
    user.password = password; // pre-save hook bcrypte
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();
    res.json({ ok: true, message: 'C\'est fait, té ! Connecte-toi avec ton nouveau mot de passe.' });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, forgotPassword, resetPassword };
