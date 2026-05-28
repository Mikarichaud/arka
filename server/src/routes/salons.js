const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { protect, optionalAuth, requirePremium, requireSalonMember } = require('../middlewares/auth');
const Salon = require('../models/Salon');
const User = require('../models/User');
const cloudinary = require('../services/cloudinary');

// Anti-spam join : un script ne doit pas pouvoir saturer un salon en quelques secondes.
const joinLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Doucement avec les tentatives de join, té !', code: 'RATE_LIMIT' },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Liste de noms marseillais pour générer un nom de salon par défaut
const SALON_NAMES = [
  'Le Comptoir de Mouloud', 'Le Salon des Sardines', 'La Table de Mireille',
  'Le Bar du Vieux-Port', 'Le Cabanon des Calanques', 'Le Coin des Galéjeurs',
  'La Pétanque de Bonneveine', 'Le Tripot de la Plaine', 'Le Cagnard du Panier',
  'La Terrasse de la Canebière',
];

function randomSalonName() {
  return SALON_NAMES[Math.floor(Math.random() * SALON_NAMES.length)];
}

function newPlayerId() { return crypto.randomUUID(); }
function newConnectionToken() { return crypto.randomUUID(); }

// Snapshot public renvoyé au client (jamais les connectionToken des autres).
// Async pour résoudre le hostIsPremium (déterminant pour l'upload média et toute
// future feature gated "host pays for the group"). En mode lancement avec
// FEATURES_UNLOCKED=true, isPremiumActive() court-circuite la lecture sub.
async function publicSalon(salon, viewerToken = null) {
  let hostIsPremium = false;
  try {
    const host = await User.findById(salon.hostUserId).select('tier role subscription');
    hostIsPremium = host ? host.isPremiumActive() : false;
  } catch { /* host introuvable → false */ }

  return {
    code: salon.code,
    shareLink: salon.shareLink,
    name: salon.name,
    status: salon.status,
    hostUserId: salon.hostUserId,
    hostIsPremium,
    players: salon.players.map((p) => ({
      playerId: p.playerId,
      pseudo: p.pseudo,
      userId: p.userId,
      postalCode: p.postalCode || null,   // pour le badge de provenance (null = anonyme → pirate)
      score: p.score,
      isHost: p.isHost,
      joinedAt: p.joinedAt,
      // Le client ne reçoit son propre token QUE via les routes create/join
      isMe: viewerToken && p.connectionToken === viewerToken,
    })),
    currentGame: salon.currentGame || null,
    games: salon.games || [],
    createdAt: salon.createdAt,
    lastActivityAt: salon.lastActivityAt,
  };
}

// POST /api/salons — créer un salon (Premium uniquement)
router.post('/', protect, requirePremium, async (req, res, next) => {
  try {
    const { name, pseudo } = req.body;
    const host = await User.findById(req.user._id);
    if (!host) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const hostPseudo = (typeof pseudo === 'string' && pseudo.trim()) || host.username;
    const playerId = newPlayerId();
    const connectionToken = newConnectionToken();

    const salon = new Salon({
      name: (typeof name === 'string' && name.trim()) ? name.trim().slice(0, 60) : randomSalonName(),
      hostUserId: host._id,
      players: [{
        playerId,
        pseudo: hostPseudo,
        userId: host._id,
        postalCode: host.postalCode || null,
        score: 0,
        connectionToken,
        isHost: true,
        joinedAt: new Date(),
      }],
      status: 'lobby',
    });
    await salon.save();

    res.status(201).json({
      salon: await publicSalon(salon, connectionToken),
      playerId,
      connectionToken,
    });
  } catch (err) { next(err); }
});

// GET /api/salons/share/:shareLink — infos publiques pour la page join
router.get('/share/:shareLink', async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ shareLink: req.params.shareLink });
    if (!salon) return res.status(404).json({ message: 'Salon introuvable.' });
    res.json({
      code: salon.code,
      name: salon.name,
      status: salon.status,
      playerCount: salon.players.length,
      maxPlayers: Salon.MAX_PLAYERS,
      isFull: salon.isFull(),
      isAlive: salon.status !== 'ended',
    });
  } catch (err) { next(err); }
});

// POST /api/salons/:code/join — rejoint un salon (auth optionnelle, rate-limited)
router.post('/:code/join', joinLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { pseudo } = req.body;
    if (typeof pseudo !== 'string' || !pseudo.trim()) {
      return res.status(400).json({ message: 'Un pseudo est requis.' });
    }
    const trimmedPseudo = pseudo.trim().slice(0, 20);

    const salon = await Salon.findOne({ code: req.params.code.toUpperCase() });
    if (!salon) return res.status(404).json({ message: 'Salon introuvable.' });
    if (salon.status === 'ended') {
      return res.status(410).json({ message: 'Ce salon est fermé.', code: 'SALON_ENDED' });
    }
    if (salon.isFull()) {
      return res.status(403).json({ message: 'Salon complet (10 joueurs max).', code: 'SALON_FULL' });
    }
    // Pseudo déjà pris dans ce salon ?
    if (salon.players.some((p) => p.pseudo.toLowerCase() === trimmedPseudo.toLowerCase())) {
      return res.status(409).json({ message: 'Ce pseudo est déjà pris dans le salon.', code: 'PSEUDO_TAKEN' });
    }

    const playerId = newPlayerId();
    const connectionToken = newConnectionToken();
    salon.players.push({
      playerId,
      pseudo: trimmedPseudo,
      userId: req.user?._id || null,
      postalCode: req.user?.postalCode || null,
      score: 0,
      connectionToken,
      isHost: false,
      joinedAt: new Date(),
    });
    salon.touchActivity();
    await salon.save();

    res.status(201).json({
      salon: await publicSalon(salon, connectionToken),
      playerId,
      connectionToken,
    });
  } catch (err) { next(err); }
});

// GET /api/salons/me — tous les salons où je suis (ou étais) membre.
// On match sur players.userId (donc connectés uniquement — les anonymes n'ont pas de persistance Mes salons).
router.get('/me', protect, async (req, res, next) => {
  try {
    const salons = await Salon.find({ 'players.userId': req.user._id })
      .sort({ lastActivityAt: -1 })
      .select('code shareLink name status players games hostUserId lastActivityAt createdAt')
      .limit(50);

    res.json({
      salons: salons.map((s) => {
        const isHost = String(s.hostUserId) === String(req.user._id);
        const myPlayer = s.players.find((p) => String(p.userId) === String(req.user._id));
        return {
          code: s.code,
          shareLink: s.shareLink,
          name: s.name,
          status: s.status,
          isHost,
          playerCount: s.players.length,
          gameCount: s.games?.length || 0,
          myLastSeenAt: myPlayer?.lastSeenAt || null,
          lastActivityAt: s.lastActivityAt,
          createdAt: s.createdAt,
        };
      }),
    });
  } catch (err) { next(err); }
});

// GET /api/salons/:code/history — historique read-only d'un salon (membre logged ou host).
// Retourne games + stats agrégées par joueur + galerie média.
router.get('/:code/history', optionalAuth, async (req, res, next) => {
  try {
    const { token } = req.query;
    const salon = await Salon.findOne({ code: req.params.code.toUpperCase() });
    if (!salon) return res.status(404).json({ message: 'Salon introuvable.' });

    // Membre via userId OU via connectionToken (anonyme) OU host.
    // L'owner (super-admin via OWNER_EMAIL) bypasse pour la modération : il peut
    // consulter l'historique et la galerie de N'IMPORTE QUEL salon. Aucun autre
    // user gaté ne passe — ce contrôle est unique à l'owner.
    const isHostUser = req.user && String(salon.hostUserId) === String(req.user._id);
    const memberByUser = req.user && salon.players.some((p) => String(p.userId) === String(req.user._id));
    const memberByToken = token ? salon.findPlayerByToken(token) : null;
    const isOwnerUser = !!req.user?.isOwner?.();
    if (!isHostUser && !memberByUser && !memberByToken && !isOwnerUser) {
      return res.status(403).json({ message: 'Accès réservé aux membres du salon.' });
    }

    // Stats agrégées par joueur sur toutes les parties archivées
    const statsByPseudo = new Map();
    for (const p of salon.players) {
      statsByPseudo.set(p.pseudo, {
        pseudo: p.pseudo,
        userId: p.userId,
        isHost: p.isHost,
        currentScore: p.score || 0,
        totalPoints: 0,
        totalCompleted: 0,
        totalRefused: 0,
        gamesPlayed: 0,
      });
    }
    const gallery = [];
    for (const game of salon.games || []) {
      // Compteur participation par pseudo
      const seenPseudos = new Set();
      for (const entry of game.history || []) {
        const s = statsByPseudo.get(entry.playerName);
        if (s) {
          if (entry.result === 'completed') {
            s.totalCompleted += 1;
            s.totalPoints += entry.points || 0;
          } else if (entry.result === 'refused') {
            s.totalRefused += 1;
          }
          seenPseudos.add(entry.playerName);
        }
        // Ajoute médias à la galerie
        for (const url of entry.media || []) {
          gallery.push({ url, playerName: entry.playerName, gameDate: game.completedAt, challengeText: entry.challengeText });
        }
      }
      for (const pseudo of seenPseudos) {
        const s = statsByPseudo.get(pseudo);
        if (s) s.gamesPlayed += 1;
      }
    }

    const games = (salon.games || []).map((g) => ({
      packId: g.packId,
      completedAt: g.completedAt,
      scores: g.scores,
      winner: [...g.scores].sort((a, b) => b.score - a.score)[0] || null,
      challengeCount: g.history?.length || 0,
      mediaCount: (g.history || []).reduce((acc, h) => acc + (h.media?.length || 0), 0),
      history: g.history,
    }));

    res.json({
      salon: {
        code: salon.code,
        name: salon.name,
        status: salon.status,
        isHostMe: isHostUser,
        playerCount: salon.players.length,
        gameCount: games.length,
        createdAt: salon.createdAt,
        lastActivityAt: salon.lastActivityAt,
      },
      stats: Array.from(statsByPseudo.values()).sort((a, b) => b.totalPoints - a.totalPoints),
      games: games.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
      gallery: gallery.sort((a, b) => new Date(b.gameDate) - new Date(a.gameDate)),
    });
  } catch (err) { next(err); }
});

// POST /api/salons/:code/resume — récupère les creds (connectionToken) de l'user
// logged-in dans ce salon. Permet à un user de retrouver un salon depuis Mes salons
// même s'il n'a pas (ou plus) les creds en localStorage (cas autre device, cache vidé).
router.post('/:code/resume', protect, async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ code: req.params.code.toUpperCase() });
    if (!salon) return res.status(404).json({ message: 'Salon introuvable.' });
    if (salon.status === 'ended') return res.status(410).json({ message: 'Salon fermé.', code: 'SALON_ENDED' });

    const player = salon.players.find((p) => String(p.userId) === String(req.user._id));
    if (!player) {
      return res.status(403).json({ message: 'Tu n\'es pas membre de ce salon.', code: 'NOT_MEMBER' });
    }

    res.json({
      playerId: player.playerId,
      connectionToken: player.connectionToken,
      pseudo: player.pseudo,
      salon: await publicSalon(salon, player.connectionToken),
    });
  } catch (err) { next(err); }
});

// DELETE /api/salons/:code — destruction explicite par le host.
// Le salon passe en status='ended', l'historique reste consultable.
router.delete('/:code', protect, async (req, res, next) => {
  try {
    const salon = await Salon.findOne({ code: req.params.code.toUpperCase() });
    if (!salon) return res.status(404).json({ message: 'Salon introuvable.' });
    if (String(salon.hostUserId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Seul le host peut détruire le salon.' });
    }
    if (salon.status === 'ended') return res.json({ ok: true });

    salon.status = 'ended';
    salon.touchActivity();
    await salon.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/salons/:code/media/upload — upload média réservé aux membres du salon.
// Bypass de requirePremium : le Premium du host "paye" pour tous les membres.
// Si le host n'est PAS Premium (post-flip FEATURES_UNLOCKED), tout le monde est bloqué.
router.post('/:code/media/upload', requireSalonMember, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier reçu.' });
  }
  // Le host doit être Premium (court-circuité par FEATURES_UNLOCKED côté isPremiumActive)
  const host = await User.findById(req.salon.hostUserId).select('tier role subscription');
  if (!host || !host.isPremiumActive()) {
    return res.status(403).json({
      message: 'Le patron du salon doit être Premium pour les souvenirs photo/vidéo.',
      code: 'HOST_NOT_PREMIUM',
    });
  }
  const isVideo = req.file.mimetype.startsWith('video/');
  const stream = cloudinary.uploader.upload_stream(
    {
      folder: `roulade-marseillaise/salons/${req.salon.code}`,
      resource_type: isVideo ? 'video' : 'image',
    },
    (error, result) => {
      if (error) {
        console.error('Cloudinary upload error (salon)', JSON.stringify(error));
        return res.status(500).json({ message: error.message || 'Upload échoué.' });
      }
      // Touch d'activité, broadcast à venir par Socket.IO côté client après réception du url
      req.salon.touchActivity();
      req.salon.save().catch(() => {});
      res.json({ url: result.secure_url, publicId: result.public_id, resourceType: isVideo ? 'video' : 'image' });
    },
  );
  stream.end(req.file.buffer);
});

module.exports = router;
module.exports.publicSalon = publicSalon;
module.exports.randomSalonName = randomSalonName;
module.exports.newPlayerId = newPlayerId;
module.exports.newConnectionToken = newConnectionToken;
