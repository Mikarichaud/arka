import { create } from 'zustand';
import api from '../services/api';

// État du Permis Marseillais : statut du certificat + session d'examen/test en cours.
const usePermisStore = create((set, get) => ({
  status: null, // payload de /permis/status
  loadingStatus: false,
  session: null, // { sessionId, mode, secondsPerQuestion, serverDeadline, questions }
  result: null, // réponse de submit
  starting: false,
  error: null,

  fetchStatus: async () => {
    set({ loadingStatus: true });
    try {
      const { data } = await api.get('/permis/status');
      set({ status: data });
      return data;
    } finally {
      set({ loadingStatus: false });
    }
  },

  start: async (mode) => {
    set({ starting: true, error: null, result: null, session: null });
    try {
      const { data } = await api.post(`/permis/${mode}/start`);
      set({ session: data });
      return { ok: true };
    } catch (e) {
      const code = e.response?.data?.code;
      set({ error: e.response?.data?.message || 'Oups, ça a coincé.' });
      return { ok: false, code };
    } finally {
      set({ starting: false });
    }
  },

  submit: async (answers) => {
    const { session } = get();
    if (!session) return null;
    const { data } = await api.post(`/permis/${session.mode}/submit`, {
      sessionId: session.sessionId,
      answers,
    });
    set({ result: data });
    return data;
  },

  reset: () => set({ session: null, result: null, error: null }),
}));

export default usePermisStore;
