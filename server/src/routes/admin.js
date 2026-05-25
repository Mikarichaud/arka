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

module.exports = router;
