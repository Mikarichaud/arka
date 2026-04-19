import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  session: null,
  pack: null,
  isSpinning: false,
  spinResult: null,
  currentChallenge: null,
  soundEnabled: true,

  setSession: (session) => set({ session }),
  setPack: (pack) => set({ pack }),
  setSoundEnabled: (v) => set({ soundEnabled: v }),

  spin: async (sessionId) => {
    if (get().isSpinning) return;
    set({ isSpinning: true, spinResult: null, currentChallenge: null });

    // Résultat aléatoire local (confirmé ensuite par l'API)
    const result = Math.floor(Math.random() * 8);

    await new Promise((r) => setTimeout(r, 4000)); // durée animation roulette

    const challenge = get().pack?.challenges?.[result] || null;
    set({ isSpinning: false, spinResult: result, currentChallenge: challenge });
    return { result, challenge };
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

  updatePlayerScore: (playerName, points) => {
    set((state) => {
      if (!state.session) return {};
      const players = state.session.players.map((p) =>
        p.name === playerName ? { ...p, score: p.score + points } : p
      );
      return { session: { ...state.session, players } };
    });
  },

  resetGame: () => set({ session: null, pack: null, spinResult: null, currentChallenge: null }),
}));

export default useGameStore;
