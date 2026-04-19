import { create } from 'zustand';

const useSessionStore = create((set) => ({
  playerNames: [],
  selectedPackId: null,
  theme: 'light',

  setPlayerNames: (names) => set({ playerNames: names }),
  setSelectedPackId: (id) => set({ selectedPackId: id }),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
  reset: () => set({ playerNames: [], selectedPackId: null }),
}));

export default useSessionStore;
