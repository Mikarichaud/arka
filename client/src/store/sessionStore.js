import { create } from 'zustand';

const useSessionStore = create((set) => ({
  playerNames: [],
  selectedPackId: null,

  setPlayerNames: (names) => set({ playerNames: names }),
  setSelectedPackId: (id) => set({ selectedPackId: id }),

  reset: () => set({ playerNames: [], selectedPackId: null }),
}));

export default useSessionStore;
