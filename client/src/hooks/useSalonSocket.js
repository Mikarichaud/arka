import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useSalonStore from '../store/salonStore';
import { playSound } from './useSound';

// URL du serveur Socket.IO. Sur le web, VITE_API_URL est relatif ('/api') → on se
// connecte en same-origin (undefined). Sur le build natif (Capacitor), VITE_API_URL
// est absolu (https://roulademarseillaise.fr/api) → on dérive l'origine du serveur,
// sinon le socket taperait sur capacitor://localhost.
const API_URL = import.meta.env.VITE_API_URL || '';
const SOCKET_URL = /^https?:\/\//.test(API_URL) ? new URL(API_URL).origin : undefined;

// Map des codes d'erreur serveur → messages marseillais affichés en toast.
// Étendre au fur et à mesure que de nouveaux codes apparaissent côté server.
const ERROR_MESSAGES = {
  HOST_ONLY: 'Cette action est réservée au patron.',
  NOT_YOUR_TURN: 'Hé, c\'est pas encore ton tour !',
  NOT_PLAYING: 'La partie n\'est pas en cours.',
  BAD_PHASE: 'Pas le bon moment pour ça, té.',
  CURRENT_CANT_VOTE: 'Le joueur qui joue peut pas voter pour lui-même !',
  BAD_INPUT: 'Action invalide.',
  PACK_NOT_FOUND: 'Pack introuvable.',
  PACK_FORBIDDEN: 'Pas accès à ce pack.',
  PACK_INCOMPLETE: 'Ce pack a pas assez de défis.',
  NEED_TWO_PLAYERS: 'Au moins 2 gatés pour démarrer !',
  SALON_GONE: 'Le salon est cassé.',
  SALON_ENDED: 'Le salon est fermé.',
  NOT_MEMBER: 'T\'es pas membre de ce salon.',
  NOT_IN_SALON: 'T\'es pas dans un salon.',
  NOT_ALLOWED: 'Pas autorisé.',
  NOT_CONNECTED: 'Pas connecté au salon.',
  SERVER_ERROR: 'Erreur serveur, hé bé. Réessaie.',
  JOIN_FAILED: 'Connexion impossible. Réessaie.',
  NOT_FOUND: 'Salon introuvable.',
  BAD_STATUS: 'Mauvais état du salon pour cette action.',
  BAD_STATE: 'État du jeu incohérent.',
  NO_PACK: 'Pas de pack chargé.',
  NO_ONLINE_PLAYERS: 'Plus aucun gaté en ligne, hé bé.',
  CURRENT_IS_ONLINE: 'Ce joueur est en ligne, pas besoin de le sauter.',
};

// Connecte la socket pour un salon donné et synchronise le salonStore.
// Renvoie { socket, emit } — emit retourne une Promise (utilise les ack Socket.IO).
export function useSalonSocket(code, connectionToken) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!code || !connectionToken) return undefined;

    const socket = io(SOCKET_URL, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    const store = () => useSalonStore.getState();

    const joinSalon = () => {
      socket.emit('salon:join', { code, connectionToken }, (ack) => {
        if (!ack?.ok) {
          store().setSocketError(ack?.code || 'JOIN_FAILED');
          return;
        }
        store().setSocketError(null);
        store().setSalon(ack.salon);
      });
    };

    socket.on('connect', () => {
      store().setSocketConnected(true);
      joinSalon();
    });

    socket.on('disconnect', () => store().setSocketConnected(false));

    socket.on('connect_error', (err) => {
      store().setSocketConnected(false);
      store().setSocketError(err?.message || 'CONNECT_ERROR');
    });

    // ── Salon lifecycle ─────────────────────────────────
    socket.on('salon:state', (salon) => store().setSalon(salon));

    socket.on('salon:playerJoined', ({ player, onlinePlayerIds }) => {
      const s = store();
      const myId = s.myPlayerId;
      s.markPlayerJoined(player);
      if (onlinePlayerIds) s.setOnlinePlayerIds(onlinePlayerIds);
      // Notif toast + petit chime — seulement si ce n'est pas moi (sinon je verrais
      // "Toi vient d'arriver" et j'entendrais le son en arrivant moi-même)
      if (player.playerId !== myId) {
        s.setRecentJoinToast({ id: player.playerId, pseudo: player.pseudo, ts: Date.now() });
        playSound('arrive');
      }
    });

    socket.on('salon:playerLeft', ({ playerId, onlinePlayerIds, disconnected }) => {
      store().markPlayerLeft(playerId, { disconnected: !!disconnected });
      if (onlinePlayerIds) store().setOnlinePlayerIds(onlinePlayerIds);
    });

    socket.on('salon:playerReconnected', ({ onlinePlayerIds }) => {
      if (onlinePlayerIds) store().setOnlinePlayerIds(onlinePlayerIds);
    });

    socket.on('salon:died', ({ reason }) => {
      useSalonStore.setState((s) => ({
        salon: s.salon ? { ...s.salon, status: 'ended', endedReason: reason } : s.salon,
      }));
    });

    // ── Gameplay (Sprint 3) ─────────────────────────────
    socket.on('game:packPicked', ({ pack, currentPlayerIndex }) => {
      store().patchCurrentGame({
        pack,
        currentPlayerIndex,
        phase: 'idle',
        currentChallenge: null,
        spinResult: null,
      });
      store().patchSalon({ status: 'playing' });
      store().setLastResult(null);
      store().setVoteProgress(null);
    });

    socket.on('game:spinning', ({ targetIndex, seed, startAt }) => {
      store().setSpinPayload({ targetIndex, seed, startAt });
      store().patchCurrentGame({
        phase: 'spinning',
        spinResult: targetIndex,
        spinSeed: seed,
        currentChallenge: null,
      });
      store().setVoteProgress(null);
    });

    socket.on('game:challenge', ({ challenge, targetIndex, currentPlayerIndex }) => {
      store().patchCurrentGame({
        phase: 'challenge',
        currentChallenge: challenge,
        spinResult: targetIndex,
        currentPlayerIndex,
      });
      store().setSpinPayload(null);
    });

    socket.on('game:relanced', ({ currentPlayerIndex }) => {
      store().patchCurrentGame({
        phase: 'idle',
        currentChallenge: null,
        spinResult: null,
        spinSeed: null,
        currentPlayerIndex,
      });
      store().setSpinPayload(null);
      store().setVoteProgress(null);
    });

    socket.on('game:voteOpened', ({ activePlayerIndex }) => {
      store().patchCurrentGame({
        phase: 'vote',
        currentPlayerIndex: activePlayerIndex,
      });
      store().setVoteProgress({ cast: 0, total: 0, yes: 0, no: 0 });
    });

    socket.on('game:voteProgress', (vp) => store().setVoteProgress(vp));

    socket.on('game:result', ({ result, points, activePlayerIndex, scores }) => {
      store().patchCurrentGame({
        phase: 'result',
        currentPlayerIndex: activePlayerIndex,
      });
      store().applyScores(scores);
      store().setLastResult({ result, points, activePlayerIndex });
      store().setVoteProgress(null);
    });

    socket.on('game:nextTurn', ({ currentPlayerIndex }) => {
      store().patchCurrentGame({
        phase: 'idle',
        currentPlayerIndex,
        currentChallenge: null,
        spinResult: null,
        spinSeed: null,
      });
      store().setLastResult(null);
      store().setVoteProgress(null);
      store().setSpinPayload(null);
    });

    socket.on('game:ended', ({ finalScores, history }) => {
      store().applyScores(finalScores);
      store().patchSalon({ status: 'between-games' });
      store().patchCurrentGame({ phase: 'result', endedHistory: history });
    });

    socket.on('game:newRound', () => {
      store().patchSalon({ status: 'lobby' });
      store().patchCurrentGame({
        pack: null,
        phase: 'idle',
        currentChallenge: null,
        spinResult: null,
        spinSeed: null,
        currentPlayerIndex: 0,
        history: [],
      });
      store().setLastResult(null);
    });

    socket.on('media:added', (payload) => {
      // Diffusion → toast live + persistance dans la galerie via salon.lastMedia
      const { url, playerId } = payload || {};
      if (!url) return;
      const s = store();
      const player = s.salon?.players?.find((p) => p.playerId === playerId);
      const resourceType = /\/video\/upload\//.test(url) ? 'video' : 'image';
      s.setMediaToast({
        id: `${playerId}-${Date.now()}`,
        url,
        resourceType,
        pseudo: player?.pseudo || 'Quelqu\'un',
        playerId,
        ts: Date.now(),
      });
    });

    socket.on('chat:emoji', ({ emoji, fromPlayerId }) => {
      store().setEmojiBurst({ id: Date.now() + Math.random(), emoji, fromPlayerId });
    });

    // iOS PWA / mobile background : quand l'app passe en background, le socket WS est
    // suspendu silencieusement par le système. Au retour foreground, on force un reconnect
    // immédiat sans attendre le timeout de ping/pong (~45s par défaut).
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const s = socketRef.current;
      if (s && !s.connected) {
        try { s.connect(); } catch { /* noop */ }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, connectionToken]);

  // Helper pour emit avec ack en Promise.
  // Auto-toast d'erreur si le serveur renvoie ack.ok === false (sauf si silent=true).
  const emit = (event, payload, opts = {}) =>
    new Promise((resolve) => {
      const s = socketRef.current;
      if (!s) {
        const ack = { ok: false, code: 'NOT_CONNECTED' };
        if (!opts.silent) useSalonStore.getState().pushErrorToast(ERROR_MESSAGES.NOT_CONNECTED);
        return resolve(ack);
      }
      s.emit(event, payload, (ack) => {
        const res = ack || { ok: true };
        if (!opts.silent && res.ok === false) {
          const msg = res.message || ERROR_MESSAGES[res.code] || `Erreur (${res.code || 'inconnue'})`;
          useSalonStore.getState().pushErrorToast(msg);
        }
        resolve(res);
      });
    });

  return { socket: socketRef.current, emit };
}
