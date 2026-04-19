import { create } from 'zustand';

const savedTheme = localStorage.getItem('roulade-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

const useSessionStore = create((set) => ({
  playerNames: [],
  selectedPackId: null,
  theme: savedTheme,

  setPlayerNames: (names) => set({ playerNames: names }),
  setSelectedPackId: (id) => set({ selectedPackId: id }),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('roulade-theme', next);
      return { theme: next };
    }),

  reset: () => set({ playerNames: [], selectedPackId: null }),
}));

export default useSessionStore;
