import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import useSessionStore from '../../store/sessionStore';
import useAuthStore from '../../store/authStore';
import useGameStore from '../../store/gameStore';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const toggleTheme = useSessionStore((s) => s.toggleTheme);
  const theme = useSessionStore((s) => s.theme);
  const { user, logout } = useAuthStore();
  const { soundEnabled, toggleSound } = useGameStore();

  return (
    <Layout className="home-page">
      <div className="home-hero">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <p className="home-by">by ARKA</p>
          <h1 className="home-title">La Roulade<br />Marseillaise</h1>
          <p className="home-tagline">Le jeu qui claque comme un carreau sur la place du village</p>
        </motion.div>

        <motion.div
          className="home-roulette-preview"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          🎡
        </motion.div>
      </div>

      <div className="home-actions">
        <motion.button
          className="btn btn-gold"
          style={{ width: '100%', fontSize: '1.1rem', padding: '18px' }}
          onClick={() => navigate('/session/setup')}
          whileTap={{ scale: 0.96 }}
        >
          Lancer une partie
        </motion.button>

        <motion.button
          className="btn btn-ghost"
          style={{ width: '100%' }}
          onClick={() => navigate('/packs')}
          whileTap={{ scale: 0.96 }}
        >
          Les packs de défis
        </motion.button>

        {user ? (
          <div className="home-user-bar">
            <span className="home-username">👋 {user.username}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Déconnexion
            </button>
          </div>
        ) : (
          <motion.button
            className="btn btn-ghost"
            style={{ width: '100%' }}
            onClick={() => navigate('/login')}
            whileTap={{ scale: 0.96 }}
          >
            Se connecter
          </motion.button>
        )}
      </div>

      <div className="home-footer">
        <button className="theme-toggle" onClick={toggleSound} title="Sons">
          {soundEnabled ? '🔊' : '🔇'}
        </button>
        <button className="theme-toggle" onClick={toggleTheme} title="Nuit sur les Goudes">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </Layout>
  );
}
