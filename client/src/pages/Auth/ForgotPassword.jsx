import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import api from '../../services/api';
import './Auth.css';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Mets ton email, té !'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(data.message || 'Si t\'es bien chez nous, t\'as un mail dans la boîte.');
      setSubmitted(true);
    } catch (err) {
      // Le serveur renvoie toujours 200, mais on garde un fallback poli
      setError(err.response?.data?.message || 'Oups, ça a pas marché. Réessaie dans un moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="auth-page">
      <button
        className="auth-back btn-back"
        onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/login'))}
      >← Retour</button>

      <div className="auth-card card">
        <h1 className="auth-title">Mot de passe oublié</h1>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="auth-success">{message}</p>
            <p className="auth-subtitle" style={{ marginTop: 16 }}>
              Le mail peut mettre une minute ou deux. Pense à regarder dans les spams, parfois il se planque là-bas.
            </p>
            <Link to="/login" className="auth-back-to-login">← Revenir à la connexion</Link>
          </motion.div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <p className="auth-subtitle">
              Mets ton email, on te file un lien pour en remettre un neuf. Ça prend pas 5 minutes.
            </p>

            <input
              className="input"
              type="email"
              placeholder="Ton email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer le mail'}
            </button>

            <Link to="/login" className="auth-back-to-login">← Revenir à la connexion</Link>
          </form>
        )}
      </div>
    </Layout>
  );
}
