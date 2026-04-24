import { create } from 'zustand';

const COMMENTS = [
  "Oh, c'est cadeau ça !",
  "À ta place, je rentrerais à la maison direct !",
  "Même mon minot il le fait les yeux fermés !",
  "Allez, sois pas fada, c'est simple !",
  "Té, t'as de la chance aujourd'hui !",
  "On s'attendait à mieux de ta part...",
  "Même la sardine elle aurait fait mieux !",
  "C'est ça le niveau ? Hé bé...",
  "Mon grand-père il le ferait les yeux fermés !",
  "Et voilà, on est entre champions !",
];

const randomComment = () => COMMENTS[Math.floor(Math.random() * COMMENTS.length)];

const TIMER_DURATION = { 1: 45, 2: 30, 3: 20 };

const useGameStore = create((set, get) => ({
  session: null,
  pack: null,
  isSpinning: false,
  spinResult: null,
  currentChallenge: null,
  currentComment: randomComment(),
  exagerateurMode: false,
  soundEnabled: localStorage.getItem('roulade-sound') !== 'false',
  gameHistory: [], // { playerName, challengeText, result, points }

  setSession: (session) => set({ session }),
  setPack: (pack) => {
    // Packs 8-24 défis : la roulette a 8 cases, donc on tire aléatoirement 8 défis
    // parmi les N du pack. Rejouer le même pack donne un nouveau tirage.
    if (pack?.challenges?.length > 8) {
      const shuffled = [...pack.challenges].sort(() => Math.random() - 0.5).slice(0, 8);
      set({ pack: { ...pack, challenges: shuffled } });
    } else {
      set({ pack });
    }
  },
  setSoundEnabled: (v) => {
    localStorage.setItem('roulade-sound', v);
    set({ soundEnabled: v });
  },
  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      localStorage.setItem('roulade-sound', next);
      return { soundEnabled: next };
    }),
  toggleExagerateur: () => set((s) => ({ exagerateurMode: !s.exagerateurMode })),

  spin: async () => {
    if (get().isSpinning) return;
    const result = Math.floor(Math.random() * 8);
    // spinResult défini AVANT le délai pour que la Roulette démarre son animation immédiatement
    set({ isSpinning: true, spinResult: result, currentChallenge: null, currentComment: randomComment() });

    await new Promise((r) => setTimeout(r, 4400)); // légèrement > durée animation roulette

    const challenge = get().pack?.challenges?.[result] || null;
    set({ isSpinning: false, currentChallenge: challenge });
    return { result, challenge };
  },

  getTimerDuration: () => {
    const level = get().currentChallenge?.intensity?.level || 1;
    return TIMER_DURATION[level] || 30;
  },

  nextPlayer: () => {
    set((state) => {
      if (!state.session) return {};
      const next = (state.session.currentPlayerIndex + 1) % state.session.players.length;
      return {
        session: { ...state.session, currentPlayerIndex: next },
        spinResult: null,
        currentChallenge: null,
      };
    });
  },

  updatePlayerScore: (playerName, basePoints) => {
    const multiplier = get().exagerateurMode ? 2 : 1;
    const points = basePoints * multiplier;
    set((state) => {
      if (!state.session) return {};
      const players = state.session.players.map((p) =>
        p.name === playerName ? { ...p, score: p.score + points } : p
      );
      const entry = {
        playerName,
        challengeText: state.currentChallenge?.text || '',
        caseNumber: (state.spinResult ?? 0) + 1,
        result: 'completed',
        points,
        media: [],
      };
      return {
        session: { ...state.session, players },
        gameHistory: [...state.gameHistory, entry],
      };
    });
    return points;
  },

  addHistoryEntry: (playerName, result) => {
    set((state) => ({
      gameHistory: [...state.gameHistory, {
        playerName,
        challengeText: state.currentChallenge?.text || '',
        caseNumber: (state.spinResult ?? 0) + 1,
        result,
        points: 0,
        media: [],
      }],
    }));
  },

  addMediaToLastEntry: (url) => {
    set((state) => {
      if (state.gameHistory.length === 0) return {};
      const updated = [...state.gameHistory];
      const last = { ...updated[updated.length - 1] };
      last.media = [...(last.media || []), url];
      updated[updated.length - 1] = last;
      return { gameHistory: updated };
    });
  },

  resetGame: () => set({
    session: null,
    pack: null,
    spinResult: null,
    currentChallenge: null,
    currentComment: randomComment(),
    exagerateurMode: false,
    gameHistory: [],
  }),
}));

export default useGameStore;
