import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon/Icon';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

export default function PremiumSuccess() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Rafraîchit le user pour refléter le nouveau tier premium
    const refresh = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch {
        // silencieux
      } finally {
        setReady(true);
      }
    };
    // Petit délai pour laisser le webhook Stripe arriver
    const t = setTimeout(refresh, 2000);
    return () => clearTimeout(t);
  }, [setUser]);

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #0d1b3e 0%, #0057A8 60%, #003d7a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: 24,
      color: 'white',
      textAlign: 'center',
    }}>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 20 }}
      >
        <Icon name="trophy" size={80} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}
      >
        <h1 style={{ fontFamily: 'var(--font-titre)', fontSize: '3rem', margin: 0, lineHeight: 1 }}>
          Bienvenue<br />en Premium !
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', maxWidth: 300, margin: 0, lineHeight: 1.6 }}>
          Tous les packs sont débloqués. Photos, galerie, historique — tout est à toi.
        </p>
      </motion.div>

      <motion.button
        className="btn btn-gold"
        style={{ padding: '18px 48px', fontSize: '1.1rem', marginTop: 8 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={() => navigate('/')}
        disabled={!ready}
      >
        {ready ? 'Lancer une partie !' : 'Activation en cours...'}
      </motion.button>
    </div>
  );
}
