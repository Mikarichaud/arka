const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Oh fada, remplis tous les champs !' });
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ message: 'Ce pseudo ou email est déjà pris, té !' });
    }
    const user = await User.create({ username, email, password });
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
