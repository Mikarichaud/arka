const { Server } = require('socket.io');
const Salon = require('../models/Salon');
const { publicSalon } = require('../routes/salons');
const { attachGameHandlers } = require('./game');

// État éphémère en mémoire (la source de vérité reste Mongo).
// activeSockets : code → Map<playerId, socketId>
const activeSockets = new Map();

function getActive(code) {
  if (!activeSockets.has(code)) activeSockets.set(code, new Map());
  return activeSockets.get(code);
}

function onlinePlayerIds(code) {
  return Array.from(getActive(code).keys());
}

function buildStatePayload(salon, viewerToken) {
  const data = publicSalon(salon, viewerToken);
  data.onlinePlayerIds = onlinePlayerIds(salon.code);
  return data;
}

// Vraie destruction d'un salon (host explicite via salon:destroy ou DELETE /api/salons/:code).
// L'historique reste consultable via /salon/:code/history mais plus aucune action n'est possible.
async function killSalon(io, salon, reason) {
  salon.status = 'ended';
  salon.touchActivity();
  await salon.save();
  io.to(`salon:${salon.code}`).emit('salon:died', { reason });
  // On laisse les sockets dans la room le temps qu'ils digèrent l'event,
  // ils se déconnecteront naturellement ensuite.
}

function initSockets(httpServer, corsOptions) {
  const io = new Server(httpServer, {
    cors: corsOptions,
    path: '/api/socket.io',
  });

  io.on('connection', (socket) => {
    // Identité posée après le `salon:join`
    socket.data.code = null;
    socket.data.playerId = null;
    socket.data.connectionToken = null;
    socket.data.isHost = false;

    // Handlers gameplay (game:*, media:added, chat:emoji)
    attachGameHandlers(io, socket);

    // ─── salon:join ────────────────────────────────────────────
    socket.on('salon:join', async ({ code, connectionToken }, ack) => {
      try {
        if (!code || !connectionToken) {
          return ack?.({ ok: false, code: 'BAD_INPUT' });
        }
        const salon = await Salon.findOne({ code: code.toUpperCase() });
        if (!salon) return ack?.({ ok: false, code: 'NOT_FOUND' });
        if (salon.status === 'ended') return ack?.({ ok: false, code: 'SALON_ENDED' });

        const player = salon.findPlayerByToken(connectionToken);
        if (!player) return ack?.({ ok: false, code: 'NOT_MEMBER' });

        // Si une autre socket représentait déjà ce joueur, on l'évacue.
        const active = getActive(salon.code);
        const prev = active.get(player.playerId);
        if (prev && prev !== socket.id) {
          const prevSock = io.sockets.sockets.get(prev);
          if (prevSock) prevSock.disconnect(true);
        }
        active.set(player.playerId, socket.id);

        socket.data.code = salon.code;
        socket.data.playerId = player.playerId;
        socket.data.connectionToken = connectionToken;
        socket.data.isHost = player.isHost;

        await socket.join(`salon:${salon.code}`);

        player.lastSeenAt = new Date();
        salon.touchActivity();
        await salon.save();

        ack?.({ ok: true, salon: buildStatePayload(salon, connectionToken) });

        // Broadcast aux autres : on envoie le player object complet pour gérer aussi
        // le cas "nouveau joueur jamais vu" (idempotent côté client via markPlayerJoined).
        const publicPlayer = {
          playerId: player.playerId,
          pseudo: player.pseudo,
          userId: player.userId,
          score: player.score,
          isHost: player.isHost,
          joinedAt: player.joinedAt,
          isMe: false,
        };
        socket.to(`salon:${salon.code}`).emit('salon:playerJoined', {
          player: publicPlayer,
          onlinePlayerIds: onlinePlayerIds(salon.code),
        });
      } catch (err) {
        console.error('salon:join error', err);
        ack?.({ ok: false, code: 'SERVER_ERROR' });
      }
    });

    // ─── salon:leave ───────────────────────────────────────────
    // Quitter volontairement. Le salon SURVIT (persistance des groupes).
    // Le joueur reste dans salon.players (on garde l'historique de qui était membre)
    // mais sort de la room et passe offline. Il pourra revenir via Mes salons / code.
    // Pour détruire vraiment le salon, le host doit utiliser `salon:destroy`.
    socket.on('salon:leave', async (_, ack) => {
      try {
        const { code, playerId } = socket.data;
        if (!code) return ack?.({ ok: false, code: 'NOT_IN_SALON' });

        const salon = await Salon.findOne({ code });
        if (salon && salon.status !== 'ended') {
          const player = salon.findPlayerById(playerId);
          if (player) player.lastSeenAt = new Date();
          salon.touchActivity();
          await salon.save();
          io.to(`salon:${code}`).emit('salon:playerLeft', {
            playerId,
            onlinePlayerIds: onlinePlayerIds(code).filter((id) => id !== playerId),
            disconnected: true, // le joueur reste dans la liste, juste offline
          });
        }

        getActive(code).delete(playerId);
        await socket.leave(`salon:${code}`);
        socket.data.code = null;
        socket.data.playerId = null;
        ack?.({ ok: true });
      } catch (err) {
        console.error('salon:leave error', err);
        ack?.({ ok: false, code: 'SERVER_ERROR' });
      }
    });

    // ─── salon:destroy ─────────────────────────────────────────
    // Host only. Vraie destruction du salon. Tous les joueurs sont notifiés
    // et le salon passe en status='ended' (l'historique reste consultable).
    socket.on('salon:destroy', async (_, ack) => {
      try {
        const { code, isHost } = socket.data;
        if (!code) return ack?.({ ok: false, code: 'NOT_IN_SALON' });
        if (!isHost) return ack?.({ ok: false, code: 'HOST_ONLY' });

        const salon = await Salon.findOne({ code });
        if (!salon || salon.status === 'ended') return ack?.({ ok: true });

        await killSalon(io, salon, 'host_destroyed');
        ack?.({ ok: true });
      } catch (err) {
        console.error('salon:destroy error', err);
        ack?.({ ok: false, code: 'SERVER_ERROR' });
      }
    });

    // ─── disconnect ────────────────────────────────────────────
    // Déconnexion involontaire (réseau, fermeture onglet). Le joueur (host ou non)
    // passe offline. Le salon survit indéfiniment — il sera peut-être nettoyé
    // après 2h d'inactivité, ou détruit explicitement par le host.
    socket.on('disconnect', async () => {
      try {
        const { code, playerId } = socket.data;
        if (!code || !playerId) return;

        const active = getActive(code);
        // Si une autre socket a déjà repris le slot, on ne fait rien (cas reconnect rapide).
        if (active.get(playerId) !== socket.id) return;
        active.delete(playerId);

        const salon = await Salon.findOne({ code });
        if (!salon || salon.status === 'ended') return;

        const player = salon.findPlayerById(playerId);
        if (player) {
          player.lastSeenAt = new Date();
          await salon.save();
        }

        io.to(`salon:${code}`).emit('salon:playerLeft', {
          playerId,
          onlinePlayerIds: onlinePlayerIds(code),
          disconnected: true,
        });
      } catch (err) {
        console.error('socket disconnect error', err);
      }
    });
  });

  return io;
}

module.exports = { initSockets, activeSockets };
