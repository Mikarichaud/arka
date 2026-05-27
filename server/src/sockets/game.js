// Handlers Socket.IO du gameplay multijoueur (Phase 9 — Sprint 3)
//
// État autoritaire serveur :
//  - phase, currentPlayerIndex, scores, pack snapshot vivent dans salon.currentGame.
//  - À chaque transition importante, on save Mongo (pour reconnect et crash recovery).
//
// Synchronisation roulette :
//  - À `game:spin`, on calcule targetIndex, on broadcast `game:spinning { targetIndex,
//    seed, startAt: Date.now() + 500ms }`. Chaque client attend startAt puis lance
//    l'animation déterministe. Les 500ms absorbent la jitter réseau.

const crypto = require('crypto');
const Salon = require('../models/Salon');
const Pack = require('../models/Pack');
const User = require('../models/User');
const { publicSalon } = require('../routes/salons');

// Délai animation roulette côté client (4s + marge)
const SPIN_ANIM_MS = 4400;
const SPIN_LEAD_MS = 500;            // délai serveur → tous les clients prêts
const POINTS_BY_LEVEL = { 1: 1, 2: 2, 3: 3 };

// Tirage 8 défis aléatoires parmi N (calque sur gameStore.setPack)
function pickEightChallenges(challenges) {
  if (!Array.isArray(challenges) || challenges.length === 0) return [];
  if (challenges.length <= 8) return challenges.slice(0, 8);
  return [...challenges].sort(() => Math.random() - 0.5).slice(0, 8);
}

function buildPackSnapshot(pack) {
  const chosen = pickEightChallenges(pack.challenges || []);
  return {
    _id: pack._id,
    name: pack.name,
    theme: pack.theme,
    challenges: chosen.map((c) => ({
      _id: c._id,
      text: c.text,
      intensity: c.intensity,
      category: c.category,
    })),
  };
}

function isHostSocket(socket) {
  return !!socket.data?.isHost;
}

function isCurrentPlayer(salon, playerId) {
  const idx = salon.currentGame?.currentPlayerIndex ?? 0;
  return salon.players[idx]?.playerId === playerId;
}

function statePayload(salon) {
  return publicSalon(salon);
}

async function emitState(io, salon) {
  io.to(`salon:${salon.code}`).emit('salon:state', await statePayload(salon));
}

// Set des playerId actuellement connectés à ce salon (room Socket.IO).
// Utilisé pour skip les joueurs offline dans la rotation et le vote.
function onlinePlayerIdsForSalon(io, code) {
  const room = io.sockets.adapter.rooms.get(`salon:${code}`);
  const ids = new Set();
  if (!room) return ids;
  for (const socketId of room) {
    const sock = io.sockets.sockets.get(socketId);
    if (sock?.data?.playerId) ids.add(sock.data.playerId);
  }
  return ids;
}

// Trouve l'index du premier joueur online (ou -1 si personne).
function findFirstOnlinePlayerIndex(salon, io) {
  const online = onlinePlayerIdsForSalon(io, salon.code);
  for (let i = 0; i < salon.players.length; i += 1) {
    if (online.has(salon.players[i].playerId)) return i;
  }
  return -1;
}

// Trouve le prochain index online après fromIndex (wrap around).
// Retourne -1 si aucun joueur n'est online.
function findNextOnlinePlayerIndex(salon, fromIndex, io) {
  const online = onlinePlayerIdsForSalon(io, salon.code);
  const n = salon.players.length;
  for (let i = 1; i <= n; i += 1) {
    const idx = (fromIndex + i) % n;
    if (online.has(salon.players[idx].playerId)) return idx;
  }
  return -1;
}

function attachGameHandlers(io, socket) {
  // ─── game:pickPack ─────────────────────────────────────
  // Host pick un pack et démarre la partie. On charge le pack populé, on snapshot
  // 8 challenges, on transitionne en status='playing' phase='idle'.
  socket.on('game:pickPack', async ({ packId }, ack) => {
    try {
      if (!isHostSocket(socket)) return ack?.({ ok: false, code: 'HOST_ONLY' });
      const salon = await Salon.findOne({ code: socket.data.code });
      if (!salon || salon.status === 'ended') return ack?.({ ok: false, code: 'SALON_GONE' });
      // On exige >=2 joueurs ONLINE (pas juste membres). Les offline ne peuvent ni
      // tourner ni voter, donc les compter bloquerait le jeu (bug rapporté).
      const onlineCount = onlinePlayerIdsForSalon(io, salon.code).size;
      if (onlineCount < 2) {
        return ack?.({ ok: false, code: 'NEED_TWO_PLAYERS', message: 'Au moins 2 joueurs en ligne pour démarrer.' });
      }

      const pack = await Pack.findById(packId).populate('challenges');
      if (!pack) return ack?.({ ok: false, code: 'PACK_NOT_FOUND' });

      // Sécurité : seul le host a besoin d'accéder. On vérifie via User pour les packs
      // Premium / persos. Pour un pack officiel non-premium, c'est OK.
      const host = await User.findById(salon.hostUserId);
      const accessible = pack.isOfficial
        ? (!pack.isPremium || host?.isPremiumActive() || host?.purchasedPacks?.some((p) => String(p) === String(pack._id)) || host?.role === 'gate')
        : String(pack.author) === String(host?._id);
      if (!accessible) return ack?.({ ok: false, code: 'PACK_FORBIDDEN' });

      const snapshot = buildPackSnapshot(pack);
      if (snapshot.challenges.length < 8) {
        return ack?.({ ok: false, code: 'PACK_INCOMPLETE', message: 'Ce pack n\'a pas assez de défis.' });
      }

      // Reset scores et historique pour cette partie
      for (const p of salon.players) p.score = 0;
      salon.status = 'playing';
      // Démarre sur le premier joueur ONLINE (skip les membres offline).
      const startIdx = findFirstOnlinePlayerIndex(salon, io);
      const firstPlayerIndex = startIdx >= 0 ? startIdx : 0;
      salon.currentGame = {
        packId: pack._id,
        pack: snapshot,
        currentPlayerIndex: firstPlayerIndex,
        phase: 'idle',
        spinSeed: null,
        spinResult: null,
        spinStartedAt: null,
        currentChallenge: null,
        votes: new Map(),
        history: [],
      };
      salon.touchActivity();
      await salon.save();

      io.to(`salon:${salon.code}`).emit('game:packPicked', {
        pack: snapshot,
        currentPlayerIndex: firstPlayerIndex,
      });
      await emitState(io, salon);
      ack?.({ ok: true });
    } catch (err) {
      console.error('game:pickPack error', err);
      ack?.({ ok: false, code: 'SERVER_ERROR' });
    }
  });

  // ─── game:spin ─────────────────────────────────────────
  // Current player only. Server picks targetIndex, broadcasts with startAt.
  socket.on('game:spin', async (_, ack) => {
    try {
      const salon = await Salon.findOne({ code: socket.data.code });
      if (!salon || salon.status !== 'playing') return ack?.({ ok: false, code: 'NOT_PLAYING' });
      if (!isCurrentPlayer(salon, socket.data.playerId)) {
        return ack?.({ ok: false, code: 'NOT_YOUR_TURN' });
      }
      if (salon.currentGame.phase !== 'idle') {
        return ack?.({ ok: false, code: 'BAD_PHASE' });
      }
      const packChallenges = salon.currentGame.pack?.challenges || [];
      if (packChallenges.length < 8) return ack?.({ ok: false, code: 'NO_PACK' });

      const targetIndex = crypto.randomInt(0, 8);
      const seed = crypto.randomInt(0, 2_000_000_000);
      const startAt = Date.now() + SPIN_LEAD_MS;

      salon.currentGame.phase = 'spinning';
      salon.currentGame.spinSeed = seed;
      salon.currentGame.spinResult = targetIndex;
      salon.currentGame.spinStartedAt = new Date(startAt);
      salon.currentGame.currentChallenge = null;
      salon.currentGame.votes = new Map();
      salon.touchActivity();
      await salon.save();

      io.to(`salon:${salon.code}`).emit('game:spinning', {
        targetIndex,
        seed,
        startAt,
      });

      // Après l'animation, on transitionne en phase 'challenge' et on broadcast le défi.
      const challenge = packChallenges[targetIndex];
      setTimeout(async () => {
        try {
          const s = await Salon.findOne({ code: salon.code });
          if (!s || s.status !== 'playing') return;
          if (s.currentGame.spinSeed !== seed) return; // un autre spin a pris la main
          s.currentGame.phase = 'challenge';
          s.currentGame.currentChallenge = challenge;
          await s.save();
          io.to(`salon:${s.code}`).emit('game:challenge', {
            challenge,
            targetIndex,
            currentPlayerIndex: s.currentGame.currentPlayerIndex,
          });
        } catch (err) {
          console.error('spin → challenge transition error', err);
        }
      }, SPIN_LEAD_MS + SPIN_ANIM_MS);

      ack?.({ ok: true });
    } catch (err) {
      console.error('game:spin error', err);
      ack?.({ ok: false, code: 'SERVER_ERROR' });
    }
  });

  // ─── game:relance ──────────────────────────────────────
  // Current player jette le défi tombé ("C'est pas ma faute !"). Marqué refused
  // dans l'historique sans gain de points, puis nouveau spin.
  socket.on('game:relance', async (_, ack) => {
    try {
      const salon = await Salon.findOne({ code: socket.data.code });
      if (!salon || salon.status !== 'playing') return ack?.({ ok: false, code: 'NOT_PLAYING' });
      if (!isCurrentPlayer(salon, socket.data.playerId)) return ack?.({ ok: false, code: 'NOT_YOUR_TURN' });
      if (salon.currentGame.phase !== 'challenge') return ack?.({ ok: false, code: 'BAD_PHASE' });

      const player = salon.players[salon.currentGame.currentPlayerIndex];
      salon.currentGame.history.push({
        playerName: player.pseudo,
        challengeText: salon.currentGame.currentChallenge?.text || '',
        caseNumber: (salon.currentGame.spinResult ?? 0) + 1,
        result: 'refused',
        points: 0,
        media: [],
        timestamp: new Date(),
      });
      salon.currentGame.phase = 'idle';
      salon.currentGame.currentChallenge = null;
      salon.currentGame.spinResult = null;
      salon.currentGame.spinStartedAt = null;
      salon.currentGame.votes = new Map();
      salon.touchActivity();
      await salon.save();

      io.to(`salon:${salon.code}`).emit('game:relanced', {
        currentPlayerIndex: salon.currentGame.currentPlayerIndex,
      });
      ack?.({ ok: true });
    } catch (err) {
      console.error('game:relance error', err);
      ack?.({ ok: false, code: 'SERVER_ERROR' });
    }
  });

  // ─── game:declareResult ────────────────────────────────
  // Current player déclare "j'ai fait" ou "je refuse".
  // - 'refused' → résultat direct (0 pt), pas de vote.
  // - 'completed' → ouvre le vote, autres joueurs votent.
  socket.on('game:declareResult', async ({ result }, ack) => {
    try {
      if (!['completed', 'refused'].includes(result)) {
        return ack?.({ ok: false, code: 'BAD_INPUT' });
      }
      const salon = await Salon.findOne({ code: socket.data.code });
      if (!salon || salon.status !== 'playing') return ack?.({ ok: false, code: 'NOT_PLAYING' });
      if (!isCurrentPlayer(salon, socket.data.playerId)) return ack?.({ ok: false, code: 'NOT_YOUR_TURN' });
      if (salon.currentGame.phase !== 'challenge') return ack?.({ ok: false, code: 'BAD_PHASE' });

      if (result === 'refused') {
        await finalizeResult(io, salon, 'refused');
      } else {
        salon.currentGame.phase = 'vote';
        salon.currentGame.votes = new Map();
        salon.touchActivity();
        await salon.save();
        io.to(`salon:${salon.code}`).emit('game:voteOpened', {
          activePlayerIndex: salon.currentGame.currentPlayerIndex,
        });
      }
      ack?.({ ok: true });
    } catch (err) {
      console.error('game:declareResult error', err);
      ack?.({ ok: false, code: 'SERVER_ERROR' });
    }
  });

  // ─── game:vote ─────────────────────────────────────────
  socket.on('game:vote', async ({ vote }, ack) => {
    try {
      if (!['completed', 'refused'].includes(vote)) return ack?.({ ok: false, code: 'BAD_INPUT' });
      const salon = await Salon.findOne({ code: socket.data.code });
      if (!salon || salon.status !== 'playing') return ack?.({ ok: false, code: 'NOT_PLAYING' });
      if (salon.currentGame.phase !== 'vote') return ack?.({ ok: false, code: 'BAD_PHASE' });
      if (isCurrentPlayer(salon, socket.data.playerId)) {
        return ack?.({ ok: false, code: 'CURRENT_CANT_VOTE' });
      }

      salon.currentGame.votes.set(socket.data.playerId, vote);

      // Décompte : on attend SEULEMENT les votes des joueurs ONLINE.
      // Les membres offline ne peuvent pas voter, donc on ne les compte pas dans `total`
      // sinon le jeu reste bloqué en phase vote (bug rapporté).
      const online = onlinePlayerIdsForSalon(io, salon.code);
      const onlineOthers = salon.players.filter(
        (p, i) => i !== salon.currentGame.currentPlayerIndex && online.has(p.playerId),
      );
      const total = onlineOthers.length;
      const yes = Array.from(salon.currentGame.votes.values()).filter((v) => v === 'completed').length;
      const no = Array.from(salon.currentGame.votes.values()).filter((v) => v === 'refused').length;
      const cast = yes + no;

      // Broadcast progression (sans révéler qui a voté quoi pour garder un peu de tension)
      io.to(`salon:${salon.code}`).emit('game:voteProgress', { cast, total, yes, no });

      if (cast >= total && total > 0) {
        const verdict = yes > total / 2 ? 'completed' : 'refused';
        await finalizeResult(io, salon, verdict);
      } else {
        await salon.save();
      }
      ack?.({ ok: true });
    } catch (err) {
      console.error('game:vote error', err);
      ack?.({ ok: false, code: 'SERVER_ERROR' });
    }
  });

  // ─── game:nextTurn ─────────────────────────────────────
  // Host ou current player. Avance au joueur suivant et repasse en idle.
  socket.on('game:nextTurn', async (_, ack) => {
    try {
      const salon = await Salon.findOne({ code: socket.data.code });
      if (!salon || salon.status !== 'playing') return ack?.({ ok: false, code: 'NOT_PLAYING' });
      const allowed = isHostSocket(socket) || isCurrentPlayer(salon, socket.data.playerId);
      if (!allowed) return ack?.({ ok: false, code: 'NOT_ALLOWED' });
      if (salon.currentGame.phase !== 'result') return ack?.({ ok: false, code: 'BAD_PHASE' });

      // Skip les joueurs offline dans la rotation : un membre absent ne doit pas
      // bloquer le jeu en attendant un spin qui ne viendra jamais.
      const nextIndex = findNextOnlinePlayerIndex(salon, salon.currentGame.currentPlayerIndex, io);
      if (nextIndex === -1) return ack?.({ ok: false, code: 'NO_ONLINE_PLAYERS' });
      salon.currentGame.currentPlayerIndex = nextIndex;
      salon.currentGame.phase = 'idle';
      salon.currentGame.currentChallenge = null;
      salon.currentGame.spinResult = null;
      salon.currentGame.spinSeed = null;
      salon.currentGame.spinStartedAt = null;
      salon.currentGame.votes = new Map();
      salon.touchActivity();
      await salon.save();

      io.to(`salon:${salon.code}`).emit('game:nextTurn', {
        currentPlayerIndex: nextIndex,
      });
      ack?.({ ok: true });
    } catch (err) {
      console.error('game:nextTurn error', err);
      ack?.({ ok: false, code: 'SERVER_ERROR' });
    }
  });

  // ─── game:skipCurrent ──────────────────────────────────
  // Host only. Permet de sauter le tour du current player s'il est offline
  // (le bouton "TOURNER" n'est plus actionné, le jeu se bloque).
  // Marque le tour comme "skipped" dans l'historique (0 pt) et avance.
  socket.on('game:skipCurrent', async (_, ack) => {
    try {
      if (!isHostSocket(socket)) return ack?.({ ok: false, code: 'HOST_ONLY' });
      const salon = await Salon.findOne({ code: socket.data.code });
      if (!salon || salon.status !== 'playing') return ack?.({ ok: false, code: 'NOT_PLAYING' });

      const currentIdx = salon.currentGame.currentPlayerIndex;
      const currentPlayer = salon.players[currentIdx];
      if (!currentPlayer) return ack?.({ ok: false, code: 'BAD_STATE' });

      // Garde : on n'autorise le skip que si le current player est vraiment offline.
      const online = onlinePlayerIdsForSalon(io, salon.code);
      if (online.has(currentPlayer.playerId)) {
        return ack?.({ ok: false, code: 'CURRENT_IS_ONLINE', message: 'Ce joueur est en ligne, pas besoin de le sauter.' });
      }

      // Entry historique : tour sauté
      salon.currentGame.history.push({
        playerName: currentPlayer.pseudo,
        challengeText: salon.currentGame.currentChallenge?.text || '(tour sauté)',
        caseNumber: (salon.currentGame.spinResult ?? 0) + 1,
        result: 'refused',
        points: 0,
        media: [],
        timestamp: new Date(),
      });

      // Avance au prochain joueur online
      const nextIndex = findNextOnlinePlayerIndex(salon, currentIdx, io);
      if (nextIndex === -1) return ack?.({ ok: false, code: 'NO_ONLINE_PLAYERS' });

      salon.currentGame.currentPlayerIndex = nextIndex;
      salon.currentGame.phase = 'idle';
      salon.currentGame.currentChallenge = null;
      salon.currentGame.spinResult = null;
      salon.currentGame.spinSeed = null;
      salon.currentGame.spinStartedAt = null;
      salon.currentGame.votes = new Map();
      salon.touchActivity();
      await salon.save();

      io.to(`salon:${salon.code}`).emit('game:nextTurn', { currentPlayerIndex: nextIndex });
      ack?.({ ok: true });
    } catch (err) {
      console.error('game:skipCurrent error', err);
      ack?.({ ok: false, code: 'SERVER_ERROR' });
    }
  });

  // ─── game:endGame ──────────────────────────────────────
  // Host termine la partie. Snapshot dans games[], retour en between-games (puis lobby).
  socket.on('game:endGame', async (_, ack) => {
    try {
      if (!isHostSocket(socket)) return ack?.({ ok: false, code: 'HOST_ONLY' });
      const salon = await Salon.findOne({ code: socket.data.code });
      if (!salon || salon.status === 'ended') return ack?.({ ok: false, code: 'SALON_GONE' });
      if (!['playing', 'between-games'].includes(salon.status)) {
        return ack?.({ ok: false, code: 'BAD_STATUS' });
      }

      // Archive
      salon.games.push({
        packId: salon.currentGame.packId,
        history: salon.currentGame.history,
        scores: salon.players.map((p) => ({
          playerId: p.playerId,
          pseudo: p.pseudo,
          score: p.score,
        })),
        completedAt: new Date(),
      });

      // Stats pour joueurs connectés uniquement
      try {
        for (const p of salon.players) {
          if (!p.userId) continue;
          const playerHistory = salon.currentGame.history.filter((h) => h.playerName === p.pseudo);
          const completed = playerHistory.filter((h) => h.result === 'completed').length;
          const refused = playerHistory.filter((h) => h.result === 'refused').length;
          await User.updateOne(
            { _id: p.userId },
            {
              $inc: {
                'stats.totalGames': 1,
                'stats.totalChallengesCompleted': completed,
                'stats.totalChallengesRefused': refused,
              },
            },
          );
        }
      } catch (err) {
        console.error('stats increment error', err);
      }

      salon.status = 'between-games';
      // On garde currentGame visible pour l'écran fin de partie. Le newRound le reset.
      salon.touchActivity();
      await salon.save();

      io.to(`salon:${salon.code}`).emit('game:ended', {
        finalScores: salon.players.map((p) => ({
          playerId: p.playerId,
          pseudo: p.pseudo,
          score: p.score,
        })),
        history: salon.currentGame.history,
      });
      await emitState(io, salon);
      ack?.({ ok: true });
    } catch (err) {
      console.error('game:endGame error', err);
      ack?.({ ok: false, code: 'SERVER_ERROR' });
    }
  });

  // ─── game:newRound ─────────────────────────────────────
  // Host relance une partie dans le même salon. Reset → lobby pour choisir un nouveau pack.
  socket.on('game:newRound', async (_, ack) => {
    try {
      if (!isHostSocket(socket)) return ack?.({ ok: false, code: 'HOST_ONLY' });
      const salon = await Salon.findOne({ code: socket.data.code });
      if (!salon || salon.status === 'ended') return ack?.({ ok: false, code: 'SALON_GONE' });

      for (const p of salon.players) p.score = 0;
      salon.status = 'lobby';
      salon.currentGame = {};
      salon.touchActivity();
      await salon.save();

      io.to(`salon:${salon.code}`).emit('game:newRound', {});
      await emitState(io, salon);
      ack?.({ ok: true });
    } catch (err) {
      console.error('game:newRound error', err);
      ack?.({ ok: false, code: 'SERVER_ERROR' });
    }
  });

  // ─── media:added ───────────────────────────────────────
  // Diffusion après upload réussi via la route REST POST /api/salons/:code/media/upload.
  // Le client émet l'event après réception du url côté REST.
  // SÉCURITÉ : on valide que l'URL est bien du Cloudinary nous-mêmes pour éviter
  // qu'un client injecte un lien externe (phishing) dans l'historique.
  socket.on('media:added', async ({ url }) => {
    try {
      if (!url || typeof url !== 'string') return;
      if (!/^https:\/\/res\.cloudinary\.com\//.test(url)) return;
      const salon = await Salon.findOne({ code: socket.data.code });
      if (!salon || salon.status !== 'playing') return;

      // Attache au dernier entry de l'historique
      const last = salon.currentGame.history?.[salon.currentGame.history.length - 1];
      if (last) {
        last.media = [...(last.media || []), url];
        salon.markModified('currentGame.history');
      }
      salon.touchActivity();
      await salon.save();

      io.to(`salon:${salon.code}`).emit('media:added', {
        url,
        playerId: socket.data.playerId,
      });
    } catch (err) {
      console.error('media:added error', err);
    }
  });

  // ─── chat:emoji ────────────────────────────────────────
  // Réaction live, broadcast simple. Throttle 250ms par socket pour bloquer le spam.
  let lastEmojiAt = 0;
  socket.on('chat:emoji', ({ emoji }) => {
    if (!emoji || typeof emoji !== 'string' || emoji.length > 8) return;
    const now = Date.now();
    if (now - lastEmojiAt < 250) return;
    lastEmojiAt = now;
    socket.to(`salon:${socket.data.code}`).emit('chat:emoji', {
      emoji,
      fromPlayerId: socket.data.playerId,
    });
  });
}

// ─── Finalisation d'un résultat (refused direct OU vote terminé) ──
async function finalizeResult(io, salon, verdict) {
  const player = salon.players[salon.currentGame.currentPlayerIndex];
  const level = salon.currentGame.currentChallenge?.intensity?.level || 1;
  const points = verdict === 'completed' ? (POINTS_BY_LEVEL[level] || 1) : 0;

  if (verdict === 'completed') {
    player.score = (player.score || 0) + points;
  }

  salon.currentGame.history.push({
    playerName: player.pseudo,
    challengeText: salon.currentGame.currentChallenge?.text || '',
    caseNumber: (salon.currentGame.spinResult ?? 0) + 1,
    result: verdict,
    points,
    media: [],
    timestamp: new Date(),
  });
  salon.currentGame.phase = 'result';
  salon.touchActivity();
  await salon.save();

  io.to(`salon:${salon.code}`).emit('game:result', {
    result: verdict,
    points,
    activePlayerIndex: salon.currentGame.currentPlayerIndex,
    scores: salon.players.map((p) => ({
      playerId: p.playerId,
      pseudo: p.pseudo,
      score: p.score,
    })),
  });
}

module.exports = { attachGameHandlers };
