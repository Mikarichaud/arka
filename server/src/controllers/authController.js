const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = { register, login, getMe };
