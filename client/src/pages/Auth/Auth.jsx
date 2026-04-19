import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import useAuthStore from '../../store/authStore';
import './Auth.css';

export default function Auth() {
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuthStore();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur inattendue, té !');
    }
  };

  return (
    <Layout className="auth-page">
      <button className="auth-back btn btn-ghost btn-sm" onClick={() => navigate('/')}>
        ← Retour
      </button>

      <div className="auth-card card">
        <h1 className="auth-title">
          {mode === 'login' ? 'Connexion' : 'Inscription'}
        </h1>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Se connecter
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            S'inscrire
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                key="username"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <input
                  className="input"
                  type="text"
                  placeholder="Pseudo"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          <input
            className="input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Chargement...' : mode === 'login' ? 'Allez !' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
