const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const crypto = require('crypto');

// Code humain à taper : 8 caractères alphanum sans ambiguïté (pas de 0/O/I/1)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode() {
  let s = '';
  for (let i = 0; i < 8; i += 1) {
    s += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return s;
}

const playerSchema = new mongoose.Schema({
  playerId: { type: String, required: true },           // uuid serveur
  pseudo: { type: String, required: true, maxlength: 20 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  score: { type: Number, default: 0 },
  connectionToken: { type: String, required: true },
  isHost: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },        // pour Mes salons + tri "dernière activité"
}, { _id: false });

const currentGameSchema = new mongoose.Schema({
  packId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pack', default: null },
  // Snapshot du pack en cours : { _id, name, theme, challenges: [8 défis dénormalisés] }
  // Dénormalisé pour ne pas dépendre du pack en DB pendant la partie (et survivre
  // à une édition/suppression du pack côté gaté).
  pack: { type: mongoose.Schema.Types.Mixed, default: null },
  currentPlayerIndex: { type: Number, default: 0 },
  phase: { type: String, enum: ['idle', 'spinning', 'challenge', 'vote', 'result'], default: 'idle' },
  spinSeed: { type: Number, default: null },
  spinResult: { type: Number, default: null },
  spinStartedAt: { type: Date, default: null },
  currentChallenge: { type: mongoose.Schema.Types.Mixed, default: null },
  votes: { type: Map, of: String, default: {} },
  history: [{
    playerName: String,
    challengeText: String,
    caseNumber: Number,
    result: { type: String, enum: ['completed', 'refused', 'pending'] },
    points: Number,
    media: [String],
    timestamp: { type: Date, default: Date.now },
  }],
}, { _id: false });

const archivedGameSchema = new mongoose.Schema({
  packId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pack' },
  history: [{
    playerName: String,
    challengeText: String,
    result: String,
    points: Number,
    media: [String],
    timestamp: Date,
  }],
  scores: [{
    playerId: String,
    pseudo: String,
    score: Number,
  }],
  completedAt: { type: Date, default: Date.now },
}, { _id: false });

const salonSchema = new mongoose.Schema({
  code: { type: String, unique: true, index: true },
  shareLink: { type: String, unique: true, index: true },
  name: { type: String, default: 'Le Salon ARKA', maxlength: 60 },
  hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  players: { type: [playerSchema], default: [] },
  status: { type: String, enum: ['lobby', 'playing', 'between-games', 'ended'], default: 'lobby', index: true },
  currentGame: { type: currentGameSchema, default: () => ({}) },
  games: { type: [archivedGameSchema], default: [] },
  lastActivityAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

salonSchema.pre('save', async function () {
  if (!this.code) {
    // Tirage avec quelques retries pour éviter une collision (très improbable sur ~10^12 combos)
    for (let i = 0; i < 5; i += 1) {
      const candidate = generateCode();
      // eslint-disable-next-line no-await-in-loop
      const exists = await this.constructor.exists({ code: candidate });
      if (!exists) { this.code = candidate; break; }
    }
    if (!this.code) throw new Error('Impossible de générer un code de salon unique.');
  }
  if (!this.shareLink) {
    this.shareLink = nanoid(10);
  }
});

salonSchema.methods.isFull = function () {
  return this.players.length >= 10;
};

salonSchema.methods.findPlayerByToken = function (token) {
  return this.players.find((p) => p.connectionToken === token) || null;
};

salonSchema.methods.findPlayerById = function (playerId) {
  return this.players.find((p) => p.playerId === playerId) || null;
};

salonSchema.methods.host = function () {
  return this.players.find((p) => p.isHost) || null;
};

salonSchema.methods.touchActivity = function () {
  this.lastActivityAt = new Date();
};

salonSchema.statics.MAX_PLAYERS = 10;
salonSchema.statics.INACTIVITY_MS = 2 * 60 * 60 * 1000; // 2h
salonSchema.statics.HOST_GRACE_MS = 60 * 1000;          // 60s

module.exports = mongoose.model('Salon', salonSchema);
