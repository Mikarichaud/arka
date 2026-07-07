// Dashboard admin réservé au propriétaire de l'instance (OWNER_EMAIL).
// Aggrégation des stats "vivantes" : users, salons, sockets actifs, etc.

const express = require('express');
const router = express.Router();
const { protect, requireOwner } = require('../middlewares/auth');
const User = require('../models/User');
const Pack = require('../models/Pack');
const Session = require('../models/Session');
const Salon = require('../models/Salon');
const Report = require('../models/Report');
const TourneeSpot = require('../models/TourneeSpot');
const cloudinary = require('../services/cloudinary');
const { activeSockets } = require('../sockets');

// Extrait { resourceType, publicId } d'une URL Cloudinary (pour supprimer l'asset).
function parseCloudinaryUrl(url) {
  const m = String(url).match(/\/(image|video)\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
  if (!m) return null;
  return { resourceType: m[1], publicId: m[2] };
}

router.get('/stats', protect, requireOwner, async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ─── Users ─────────────────────────────────────────
    const [
      totalUsers, freeUsers, premiumUsers, gateUsers,
      signupsLast7d, signupsLast30d,
      subActive, subCanceled, subPastDue, subCancelAtEnd,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ tier: 'free' }),
      User.countDocuments({ tier: 'premium' }),
      User.countDocuments({ role: 'gate' }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ 'subscription.status': 'active' }),
      User.countDocuments({ 'subscription.status': 'canceled' }),
      User.countDocuments({ 'subscription.status': 'past_due' }),
      User.countDocuments({ 'subscription.cancelAtPeriodEnd': true, 'subscription.status': 'active' }),
    ]);

    // ─── Packs ────────────────────────────────────────
    const [packsOfficial, packsCustom] = await Promise.all([
      Pack.countDocuments({ isOfficial: true }),
      Pack.countDocuments({ isOfficial: false }),
    ]);

    // ─── Sessions locales (parties sauvegardées) ──────
    const [totalSessions, totalSessionMedia] = await Promise.all([
      Session.countDocuments(),
      // Compte tous les médias dans tous les history des sessions
      Session.aggregate([
        { $unwind: { path: '$history', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$history.media', preserveNullAndEmptyArrays: true } },
        { $match: { 'history.media': { $ne: null } } },
        { $count: 'total' },
      ]).then((r) => r[0]?.total || 0),
    ]);

    // ─── Salons ───────────────────────────────────────
    const [
      totalSalons, salonsLobby, salonsPlaying, salonsBetween, salonsEnded,
      salonGamesAgg,
    ] = await Promise.all([
      Salon.countDocuments(),
      Salon.countDocuments({ status: 'lobby' }),
      Salon.countDocuments({ status: 'playing' }),
      Salon.countDocuments({ status: 'between-games' }),
      Salon.countDocuments({ status: 'ended' }),
      // Total parties jouées dans les salons (somme des games[] de tous les salons)
      Salon.aggregate([
        { $project: { gameCount: { $size: { $ifNull: ['$games', []] } } } },
        { $group: { _id: null, total: { $sum: '$gameCount' } } },
      ]).then((r) => r[0]?.total || 0),
    ]);

    // ─── Sockets temps réel (en mémoire) ──────────────
    // On commence par compter, puis on enrichit chaque salon avec les pseudos
    // online via une lookup Mongo unique (un seul .find avec $in sur les codes).
    let socketsConnected = 0;
    const activeCodes = [];
    const onlineByCode = new Map(); // code → Set<playerId>
    for (const [code, playerMap] of activeSockets.entries()) {
      const onlineCount = playerMap.size;
      socketsConnected += onlineCount;
      if (onlineCount > 0) {
        activeCodes.push(code);
        onlineByCode.set(code, new Set(playerMap.keys()));
      }
    }

    let activeSalonRooms = [];
    if (activeCodes.length > 0) {
      const salons = await Salon.find({ code: { $in: activeCodes } })
        .select('code name hostUserId players status currentGame.phase')
        .lean();
      // Collecte userIds pour résoudre les emails (info owner pour la modération)
      const userIds = new Set();
      for (const s of salons) {
        for (const p of s.players || []) {
          if (p.userId) userIds.add(String(p.userId));
        }
      }
      const usersById = new Map();
      if (userIds.size > 0) {
        const users = await User.find({ _id: { $in: Array.from(userIds) } })
          .select('username email tier role')
          .lean();
        for (const u of users) usersById.set(String(u._id), u);
      }
      activeSalonRooms = salons.map((s) => {
        const onlineIds = onlineByCode.get(s.code) || new Set();
        const players = (s.players || [])
          .filter((p) => onlineIds.has(p.playerId))
          .map((p) => {
            const u = p.userId ? usersById.get(String(p.userId)) : null;
            return {
              playerId: p.playerId,
              pseudo: p.pseudo,
              isHost: p.isHost,
              userId: p.userId || null,
              username: u?.username || null,
              email: u?.email || null,
              tier: u?.tier || null,
              role: u?.role || null,
            };
          });
        return {
          code: s.code,
          name: s.name,
          status: s.status,
          phase: s.currentGame?.phase || null,
          onlineCount: players.length,
          players,
        };
      });
      // Tri descendant par nb joueurs online
      activeSalonRooms.sort((a, b) => b.onlineCount - a.onlineCount);
    }

    // ─── MRR estimé (à partir des abonnements actifs) ─
    // Note : on n'a pas le prix exact stocké côté user, on estime à 4.99€/mois en moyenne.
    // Pour un MRR précis il faudrait croiser avec Stripe API (à voir plus tard).
    const estimatedMRR = subActive * 4.99;

    res.json({
      ts: now.toISOString(),
      users: {
        total: totalUsers,
        free: freeUsers,
        premium: premiumUsers,
        gate: gateUsers,
        signupsLast7d,
        signupsLast30d,
      },
      subscriptions: {
        active: subActive,
        canceled: subCanceled,
        pastDue: subPastDue,
        cancelAtPeriodEnd: subCancelAtEnd,
        estimatedMRR: Math.round(estimatedMRR * 100) / 100,
      },
      packs: {
        official: packsOfficial,
        custom: packsCustom,
        total: packsOfficial + packsCustom,
      },
      sessions: {
        totalLocalSaved: totalSessions,
        totalMedia: totalSessionMedia,
      },
      salons: {
        total: totalSalons,
        lobby: salonsLobby,
        playing: salonsPlaying,
        betweenGames: salonsBetween,
        ended: salonsEnded,
        totalGamesPlayed: salonGamesAgg,
        activeRooms: activeSalonRooms,
      },
      live: {
        socketsConnected,
        salonsWithPlayers: activeSalonRooms.length,
      },
    });
  } catch (err) { next(err); }
});

// ─── Fichier des joueurs : un user par ligne, avec stats croisées ─────────────
// Owner uniquement. Sert l'onglet "Joueurs" du dashboard (tableau triable).
// Croise les stats du doc User avec : salons hébergés (hostUserId), parties
// locales sauvegardées (Session.createdBy) et présence live (activeSockets).
router.get('/users', protect, requireOwner, async (req, res, next) => {
  try {
    // Croisements DB en parallèle (1 group par source, pas de N+1).
    const [users, hostAgg, sessionAgg] = await Promise.all([
      User.find()
        .select('username email avatar postalCode tier role createdAt lastSeenAt subscription purchasedPacks purchasedSkins customPacks stats')
        .lean(),
      Salon.aggregate([
        { $match: { hostUserId: { $ne: null } } },
        { $group: { _id: '$hostUserId', count: { $sum: 1 } } },
      ]),
      Session.aggregate([
        { $match: { createdBy: { $ne: null } } },
        { $group: { _id: '$createdBy', count: { $sum: 1 } } },
      ]),
    ]);

    const hostedByUser = new Map(hostAgg.map((r) => [String(r._id), r.count]));
    const sessionsByUser = new Map(sessionAgg.map((r) => [String(r._id), r.count]));

    // Présence live : userIds online dérivés de activeSockets (en mémoire).
    const activeCodes = [];
    const onlineByCode = new Map();
    for (const [code, playerMap] of activeSockets.entries()) {
      if (playerMap.size > 0) {
        activeCodes.push(code);
        onlineByCode.set(code, new Set(playerMap.keys()));
      }
    }
    const onlineUserIds = new Set();
    if (activeCodes.length > 0) {
      const salons = await Salon.find({ code: { $in: activeCodes } })
        .select('code players')
        .lean();
      for (const s of salons) {
        const onlineIds = onlineByCode.get(s.code) || new Set();
        for (const p of s.players || []) {
          if (p.userId && onlineIds.has(p.playerId)) onlineUserIds.add(String(p.userId));
        }
      }
    }

    const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase();

    const rows = users.map((u) => {
      const id = String(u._id);
      const completed = u.stats?.totalChallengesCompleted || 0;
      const refused = u.stats?.totalChallengesRefused || 0;
      const denom = completed + refused;
      // null = pas encore assez de défis pour juger la "forme".
      const formRate = denom > 0 ? Math.round((completed / denom) * 100) : null;
      return {
        id,
        username: u.username,
        email: u.email,
        avatar: u.avatar || null,
        postalCode: u.postalCode || null,
        tier: u.tier,
        role: u.role,
        isOwner: !!ownerEmail && u.email === ownerEmail,
        createdAt: u.createdAt,
        lastSeenAt: u.lastSeenAt || null,
        subscription: {
          status: u.subscription?.status || null,
          currentPeriodEnd: u.subscription?.currentPeriodEnd || null,
          cancelAtPeriodEnd: !!u.subscription?.cancelAtPeriodEnd,
        },
        online: onlineUserIds.has(id),
        counts: {
          games: u.stats?.totalGames || 0,
          completed,
          refused,
          formRate,
          customPacks: (u.customPacks || []).length,
          purchasedPacks: (u.purchasedPacks || []).length,
          purchasedSkins: (u.purchasedSkins || []).length,
          salonsHosted: hostedByUser.get(id) || 0,
          sessionsSaved: sessionsByUser.get(id) || 0,
        },
      };
    });

    // Tri par défaut : derniers inscrits en tête (le client re-trie ensuite).
    rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({ users: rows, total: rows.length });
  } catch (err) { next(err); }
});

// ─── Galerie owner : toutes les photos/vidéos classées par pseudo ─────────────
// Aggrège 3 sources : (1) parties archivées des salons, (2) partie en cours d'un
// salon (currentGame.history), (3) parties locales (Session). Owner uniquement.
router.get('/gallery', protect, requireOwner, async (req, res, next) => {
  try {
    const projectSalonArchived = {
      _id: 0,
      url: '$games.history.media',
      pseudo: '$games.history.playerName',
      challengeText: '$games.history.challengeText',
      salonCode: '$code',
      salonName: '$name',
      gameDate: '$games.completedAt',
      source: { $literal: 'salon' },
    };
    const projectSalonLive = {
      _id: 0,
      url: '$currentGame.history.media',
      pseudo: '$currentGame.history.playerName',
      challengeText: '$currentGame.history.challengeText',
      salonCode: '$code',
      salonName: '$name',
      gameDate: '$currentGame.history.timestamp',
      source: { $literal: 'salon-live' },
    };
    const projectSession = {
      _id: 0,
      url: '$history.media',
      pseudo: '$history.playerName',
      challengeText: '$history.challengeText',
      shareLink: '$shareLink',
      gameDate: '$history.timestamp',
      source: { $literal: 'local' },
    };

    const [salonArchived, salonLive, sessionItems] = await Promise.all([
      Salon.aggregate([
        { $unwind: '$games' },
        { $unwind: '$games.history' },
        { $unwind: '$games.history.media' },
        { $match: { 'games.history.media': { $type: 'string' } } },
        { $project: projectSalonArchived },
      ]),
      Salon.aggregate([
        { $match: { 'currentGame.history': { $exists: true, $ne: [] } } },
        { $unwind: '$currentGame.history' },
        { $unwind: '$currentGame.history.media' },
        { $match: { 'currentGame.history.media': { $type: 'string' } } },
        { $project: projectSalonLive },
      ]),
      Session.aggregate([
        { $unwind: '$history' },
        { $unwind: '$history.media' },
        { $match: { 'history.media': { $type: 'string' } } },
        { $project: projectSession },
      ]),
    ]);

    // Fusion + détection resourceType + grouping par pseudo
    const all = [...salonArchived, ...salonLive, ...sessionItems];
    const grouped = new Map();
    for (const item of all) {
      const pseudo = (item.pseudo || 'Anonyme').trim() || 'Anonyme';
      if (!grouped.has(pseudo)) {
        grouped.set(pseudo, {
          pseudo,
          items: [],
          photoCount: 0,
          videoCount: 0,
          latestAt: null,
        });
      }
      const g = grouped.get(pseudo);
      const resourceType = /\/video\/upload\//.test(item.url) ? 'video' : 'image';
      const entry = { ...item, resourceType };
      if (resourceType === 'video') g.videoCount += 1;
      else g.photoCount += 1;
      if (!g.latestAt || new Date(item.gameDate) > new Date(g.latestAt)) {
        g.latestAt = item.gameDate;
      }
      g.items.push(entry);
    }

    // Tri : pseudos par activité récente desc, items au sein du pseudo par date desc
    const pseudos = Array.from(grouped.values());
    for (const g of pseudos) {
      g.items.sort((a, b) => new Date(b.gameDate || 0) - new Date(a.gameDate || 0));
      g.count = g.items.length;
    }
    pseudos.sort((a, b) => new Date(b.latestAt || 0) - new Date(a.latestAt || 0));

    res.json({
      pseudos,
      totals: {
        pseudoCount: pseudos.length,
        photoCount: pseudos.reduce((s, p) => s + p.photoCount, 0),
        videoCount: pseudos.reduce((s, p) => s + p.videoCount, 0),
        total: all.length,
      },
    });
  } catch (err) { next(err); }
});

// ─── Modération UGC (owner only) : signalements de médias de salon ────────────
// GET liste (pending en tête) + counts.
router.get('/reports', protect, requireOwner, async (req, res, next) => {
  try {
    const reports = await Report.find()
      .sort({ status: 1, createdAt: -1 }) // 'pending' < 'resolved'/'dismissed' alphabétiquement
      .limit(500)
      .lean();
    const pendingCount = reports.filter((r) => r.status === 'pending').length;
    res.json({ reports, pendingCount, total: reports.length });
  } catch (err) { next(err); }
});

// Résoudre un signalement : action 'delete' (retire le média partout + Cloudinary)
// ou 'dismiss' (rejette). Owner only.
router.post('/reports/:id/resolve', protect, requireOwner, async (req, res, next) => {
  try {
    const { action } = req.body || {};
    if (!['delete', 'dismiss'].includes(action)) {
      return res.status(400).json({ message: 'Action invalide.' });
    }
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Signalement introuvable.' });

    if (action === 'delete') {
      const url = report.mediaUrl;
      // 1. Retire l'URL de l'historique du salon (partie en cours + parties archivées).
      const salon = await Salon.findOne({ code: report.salonCode });
      if (salon) {
        const stripFromHistory = (history) => {
          for (const entry of history || []) {
            if (Array.isArray(entry.media) && entry.media.includes(url)) {
              entry.media = entry.media.filter((u) => u !== url);
            }
          }
        };
        stripFromHistory(salon.currentGame?.history);
        for (const game of salon.games || []) stripFromHistory(game.history);
        salon.markModified('currentGame');
        salon.markModified('games');
        await salon.save();
      }
      // 2. Supprime l'asset Cloudinary (best-effort).
      const parsed = parseCloudinaryUrl(url);
      if (parsed) {
        try {
          await cloudinary.uploader.destroy(parsed.publicId, { resource_type: parsed.resourceType });
        } catch (e) { /* asset déjà absent / erreur réseau : on continue */ }
      }
      // 3. Marque ce signalement + tous les autres en attente sur le même média.
      await Report.updateMany(
        { mediaUrl: url, status: 'pending' },
        { $set: { status: 'resolved', resolution: 'media-deleted', resolvedBy: req.user._id, resolvedAt: new Date() } }
      );
    } else {
      report.status = 'dismissed';
      report.resolution = 'dismissed';
      report.resolvedBy = req.user._id;
      report.resolvedAt = new Date();
      await report.save();
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// --- Campagne stickers « Tournée » : stats par spot + mapping quartier ---
const withStats = (s) => {
  const conversions = (s.appClicks || 0) + (s.signups || 0);
  const rate = s.scans > 0 ? Math.round((conversions / s.scans) * 100) : 0;
  return { ...s, conversions, rate };
};

router.get('/tournee', protect, requireOwner, async (req, res, next) => {
  try {
    await TourneeSpot.seedDefaultsIfEmpty();
    const spots = await TourneeSpot.find().sort({ createdAt: 1 }).lean();
    res.json({ spots: spots.map(withStats) });
  } catch (err) { next(err); }
});

// Crée un nouveau spot (nouveau sticker) avec un ID séquentiel.
router.post('/tournee', protect, requireOwner, async (req, res, next) => {
  try {
    const spotId = await TourneeSpot.nextSpotId();
    const label = typeof req.body.label === 'string' ? req.body.label.trim().slice(0, 60) : '';
    const spot = await TourneeSpot.create({ spot: spotId, label });
    res.status(201).json({ spot: withStats(spot.toObject()) });
  } catch (err) { next(err); }
});

// Mappe un spot à un quartier (label) et/ou remet ses compteurs à zéro.
router.put('/tournee/:spot', protect, requireOwner, async (req, res, next) => {
  try {
    const update = {};
    if (typeof req.body.label === 'string') update.label = req.body.label.trim().slice(0, 60);
    if (req.body.reset === true) { update.scans = 0; update.appClicks = 0; update.signups = 0; }
    const spot = await TourneeSpot.findOneAndUpdate({ spot: req.params.spot }, update, { new: true });
    if (!spot) return res.status(404).json({ message: 'Spot introuvable.' });
    res.json({ spot: withStats(spot.toObject()) });
  } catch (err) { next(err); }
});

// Supprime un spot.
router.delete('/tournee/:spot', protect, requireOwner, async (req, res, next) => {
  try {
    await TourneeSpot.deleteOne({ spot: req.params.spot });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
