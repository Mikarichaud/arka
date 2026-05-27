// Dashboard admin réservé au propriétaire de l'instance (OWNER_EMAIL).
// Aggrégation des stats "vivantes" : users, salons, sockets actifs, etc.

const express = require('express');
const router = express.Router();
const { protect, requireOwner } = require('../middlewares/auth');
const User = require('../models/User');
const Pack = require('../models/Pack');
const Session = require('../models/Session');
const Salon = require('../models/Salon');
const { activeSockets } = require('../sockets');

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
    let socketsConnected = 0;
    const activeSalonRooms = [];
    for (const [code, playerMap] of activeSockets.entries()) {
      const onlineCount = playerMap.size;
      socketsConnected += onlineCount;
      if (onlineCount > 0) activeSalonRooms.push({ code, onlineCount });
    }
    // Tri descendant par nb joueurs
    activeSalonRooms.sort((a, b) => b.onlineCount - a.onlineCount);

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

module.exports = router;
