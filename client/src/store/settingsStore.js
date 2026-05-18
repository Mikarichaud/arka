import { create } from 'zustand';

const SOUND_KEY = 'roulade-sound';
const THEME_KEY = 'roulade-theme';

const initialTheme = localStorage.getItem(THEME_KEY) || 'light';
document.documentElement.setAttribute('data-theme', initialTheme);

const storedSound = localStorage.getItem(SOUND_KEY);
const initialSoundEnabled = storedSound === null ? true : storedSound === 'true';

const useSettingsStore = create((set) => ({
  theme: initialTheme,
  soundEnabled: initialSoundEnabled,

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
      return { theme: next };
    }),

  setSoundEnabled: (v) => {
    localStorage.setItem(SOUND_KEY, String(v));
    set({ soundEnabled: v });
  },

  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      localStorage.setItem(SOUND_KEY, String(next));
      return { soundEnabled: next };
    }),
}));

export default useSettingsStore;
