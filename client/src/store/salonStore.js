import { create } from 'zustand';

// État du salon courant. Reset à chaque entrée dans un salon différent.
const useSalonStore = create((set, get) => ({
  salon: null,                       // snapshot complet renvoyé par le serveur
  myPlayerId: null,                  // mon playerId (récupéré au create/join)
  onlinePlayerIds: [],               // liste éphémère des joueurs en ligne
  socketConnected: false,
  socketError: null,

  // ── Gameplay (Sprint 3) ──
  // L'état serveur-autoritaire vit dans salon.currentGame. Ce qui suit est
  // de l'UI éphémère côté client (timer du spin synchro, dernier résultat, emoji).
  spinPayload: null,                 // { targetIndex, seed, startAt } pendant un spin
  lastResult: null,                  // { result, points, activePlayerIndex } après finalize
  voteProgress: null,                // { cast, total, yes, no }
  emojiBurst: null,                  // { id, emoji, fromPlayerId } pour réaction live
  recentJoinToast: null,             // { id, pseudo, ts } notification d'un joueur qui arrive
  errorToast: null,                  // { message, ts } notification d'erreur (emit ack failed, etc.)

  setSalon: (salon) => set({ salon, onlinePlayerIds: salon?.onlinePlayerIds || [] }),
  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setOnlinePlayerIds: (ids) => set({ onlinePlayerIds: ids }),
  setSocketConnected: (connected) => set({ socketConnected: connected }),
  setSocketError: (err) => set({ socketError: err }),

  // disconnected=true → simple offline (peut revenir). Sinon → leave volontaire, on retire des players.
  markPlayerLeft: (playerId, { disconnected = false } = {}) => set((s) => {
    const onlinePlayerIds = s.onlinePlayerIds.filter((id) => id !== playerId);
    if (disconnected || !s.salon) return { onlinePlayerIds };
    return {
      onlinePlayerIds,
      salon: {
        ...s.salon,
        players: s.salon.players.filter((p) => p.playerId !== playerId),
      },
    };
  }),
  markPlayerJoined: (player) => set((s) => {
    if (!s.salon) return {};
    const exists = s.salon.players.some((p) => p.playerId === player.playerId);
    return {
      salon: exists ? s.salon : { ...s.salon, players: [...s.salon.players, player] },
      onlinePlayerIds: s.onlinePlayerIds.includes(player.playerId)
        ? s.onlinePlayerIds
        : [...s.onlinePlayerIds, player.playerId],
    };
  }),

  // ── Patchs partiels de salon.currentGame venant des events serveur ──
  patchCurrentGame: (patch) => set((s) => {
    if (!s.salon) return {};
    return {
      salon: {
        ...s.salon,
        currentGame: { ...(s.salon.currentGame || {}), ...patch },
      },
    };
  }),

  patchSalon: (patch) => set((s) => {
    if (!s.salon) return {};
    return { salon: { ...s.salon, ...patch } };
  }),

  applyScores: (scores) => set((s) => {
    if (!s.salon || !Array.isArray(scores)) return {};
    const byId = new Map(scores.map((sc) => [sc.playerId, sc.score]));
    return {
      salon: {
        ...s.salon,
        players: s.salon.players.map((p) => byId.has(p.playerId) ? { ...p, score: byId.get(p.playerId) } : p),
      },
    };
  }),

  setSpinPayload: (payload) => set({ spinPayload: payload }),
  setLastResult: (r) => set({ lastResult: r }),
  setVoteProgress: (vp) => set({ voteProgress: vp }),
  setEmojiBurst: (e) => set({ emojiBurst: e }),
  setRecentJoinToast: (t) => set({ recentJoinToast: t }),
  pushErrorToast: (message) => set({ errorToast: { message, ts: Date.now() } }),
  clearErrorToast: () => set({ errorToast: null }),

  // Reset complet : quitter un salon
  reset: () => set({
    salon: null,
    myPlayerId: null,
    onlinePlayerIds: [],
    socketConnected: false,
    socketError: null,
    spinPayload: null,
    lastResult: null,
    voteProgress: null,
    emojiBurst: null,
    recentJoinToast: null,
    errorToast: null,
  }),

  // Lecture utilitaire : suis-je le host ?
  amIHost: () => {
    const { salon, myPlayerId } = get();
    if (!salon || !myPlayerId) return false;
    const me = salon.players.find((p) => p.playerId === myPlayerId);
    return !!me?.isHost;
  },

  amICurrentPlayer: () => {
    const { salon, myPlayerId } = get();
    if (!salon || !myPlayerId) return false;
    const idx = salon.currentGame?.currentPlayerIndex ?? -1;
    return salon.players[idx]?.playerId === myPlayerId;
  },
}));

export default useSalonStore;
