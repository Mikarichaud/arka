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

module.exports = router;
