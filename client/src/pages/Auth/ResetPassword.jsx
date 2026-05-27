import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import api from '../../services/api';
import './Auth.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Lien invalide. Refais une demande sur la page mot de passe oublié.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password || password.length < 6) {
      setError('Mot de passe : 6 caractères minimum.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe sont pas pareils, té !');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      // Petit délai pour laisser lire le message marseillais
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Lien invalide ou expiré. Refais une demande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="auth-page">
      <div className="auth-card card">
        <h1 className="auth-title">Nouveau mot de passe</h1>

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="auth-success">
              C'est fait, té ! On t'emmène à la connexion…
            </p>
          </motion.div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <p className="auth-subtitle">
              Choisis un nouveau mot de passe. 6 caractères minimum, sois pas radin.
            </p>

            <input
              className="input"
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              required
              disabled={!token}
            />

            <input
              className="input"
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              disabled={!token}
            />

            {error && <p className="auth-error">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading || !token}
            >
              {loading ? 'Sauvegarde…' : 'Sauver le nouveau mot de passe'}
            </button>

            <Link to="/login/forgot" className="auth-back-to-login">
              Redemander un nouveau lien
            </Link>
          </form>
        )}
      </div>
    </Layout>
  );
}
