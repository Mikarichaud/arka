import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (identifier, password) => {
        set({ isLoading: true });
        const { data } = await api.post('/auth/login', { login: identifier, password });
        localStorage.setItem('token', data.token);
        set({ user: data.user, token: data.token, isLoading: false });
      },

      register: async (username, email, password, postalCode) => {
        set({ isLoading: true });
        try {
          // Attribution campagne stickers : si l'user vient d'un QR /tournee, on relie l'inscription au spot.
          const spot = localStorage.getItem('tournee_spot') || undefined;
          const { data } = await api.post('/auth/register', { username, email, password, postalCode, spot });
          if (spot) localStorage.removeItem('tournee_spot');
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);

export default useAuthStore;
