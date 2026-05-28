import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expiré/invalide : on nettoie l'état auth (token + store persisté)
      // pour éviter un état incohérent (user présent mais token mort) après reload.
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      // Redirige vers /login qui, côté SPA, renvoie à l'accueil et ouvre la modale de connexion.
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
