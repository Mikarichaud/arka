import { create } from 'zustand';

// Pilote la modale d'authentification globale (montée une fois dans App).
// mode null = fermée. redirectTo = où aller après un login réussi (ex: page protégée).
const useAuthModalStore = create((set) => ({
  mode: null, // 'login' | 'register' | 'forgot' | 'changePassword' | 'changeEmail' | 'logout'
  redirectTo: null,
  payload: null, // données contextuelles (ex: { newEmail } pour changeEmail)
  open: (mode, opts = {}) => set({ mode, redirectTo: opts.redirectTo || null, payload: opts.payload || null }),
  close: () => set({ mode: null, redirectTo: null, payload: null }),
}));

export default useAuthModalStore;
