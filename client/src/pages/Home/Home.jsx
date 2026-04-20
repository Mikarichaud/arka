import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import HomeRoulette from '../../components/HomeRoulette/HomeRoulette';
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

      {/* ── Colonne gauche : brand + actions (desktop) ─────────────
          Sur mobile : display:contents → brand et actions deviennent
          des enfants directs du flex, avec order CSS                */}
      <div className="home-left">
        <motion.div
          className="home-brand"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="home-by">by ARKA</p>
          <h1 className="home-title">La Roulade<br />Marseillaise</h1>
          <p className="home-tagline">Le jeu qui claque comme un carreau sur la place du village</p>
        </motion.div>

        <motion.div
          className="home-actions"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18 }}
        >
          <button className="btn btn-gold home-btn-play"
            onClick={() => navigate('/session/setup')}>
            Lancer une partie
          </button>
          <button className="btn btn-ghost home-ghost-btn"
            onClick={() => navigate('/packs')}>
            Les packs de défis
          </button>
          {user ? (
            <div className="home-user-bar">
              <span className="home-username">
                <Icon name="wave" size={16} style={{ marginRight: 6 }} />
                {user.username}
              </span>
              <button className="btn btn-ghost btn-sm home-ghost-btn" onClick={logout}>
                Déconnexion
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost home-ghost-btn"
              onClick={() => navigate('/login')}>
              Se connecter
            </button>
          )}
        </motion.div>
      </div>

      {/* ── Roulette ── */}
      <motion.div
        className="home-roulette-area"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.1 }}
      >
        <HomeRoulette onClick={() => navigate('/session/setup')} />
      </motion.div>

      {/* Toggles fixés */}
      <div className="home-footer">
        <button className="theme-toggle" onClick={toggleSound} title="Sons">
          <Icon name={soundEnabled ? 'sound-on' : 'sound-off'} size={20} />
        </button>
        <button className="theme-toggle" onClick={toggleTheme} title="Nuit sur les Goudes">
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={20} />
        </button>
      </div>

    </Layout>
  );
}
