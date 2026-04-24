import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import './Profile.css';

function Avatar({ username }) {
  const initials = (username || '?').slice(0, 2).toUpperCase();
  return <div className="profile-avatar">{initials}</div>;
}

function StatCard({ icon, value, label }) {
  return (
    <div className="profile-stat-card">
      <Icon name={icon} size={22} />
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();
  const [sub, setSub] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/payments/subscription')
      .then(({ data }) => setSub(data))
      .catch(() => {});
    // Rafraîchit le user depuis le serveur
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {});
  }, []);

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await api.post('/payments/portal');
      window.location.href = data.url;
    } catch {
      setPortalLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  if (!user) return null;

  const isPremium = sub?.isPremiumActive || user?.tier === 'premium';
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <Layout className="profile-page">

      <div className="profile-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Retour</button>
        <h1 className="profile-title">Mon Profil</h1>
      </div>

      {/* Identité */}
      <motion.div
        className="profile-identity card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Avatar username={user.username} />
        <div className="profile-identity-info">
          <span className="profile-username">
            {user.username}
            {isPremium && <Icon name="star" size={16} style={{ marginLeft: 8 }} />}
          </span>
          <span className="profile-email">{user.email}</span>
          <span className={`profile-tier-badge ${isPremium ? 'premium' : 'free'}`}>
            {isPremium ? '⭐ Premium' : 'Gratuit'}
          </span>
        </div>
      </motion.div>

      {/* Abonnement */}
      <motion.div
        className="profile-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <h2 className="profile-section-title">Abonnement</h2>
        {isPremium ? (
          <div className="profile-sub-card card premium">
            <div className="profile-sub-info">
              <Icon name="star" size={20} />
              <div>
                <p className="profile-sub-status">Premium actif</p>
                {periodEnd && <p className="profile-sub-date">Renouvellement le {periodEnd}</p>}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? '...' : 'Gérer'}
            </button>
          </div>
        ) : (
          <div className="profile-sub-card card">
            <div className="profile-sub-info">
              <Icon name="lock" size={20} />
              <div>
                <p className="profile-sub-status">Plan gratuit</p>
                <p className="profile-sub-date">3 packs disponibles</p>
              </div>
            </div>
            <button className="btn btn-gold btn-sm" onClick={() => navigate('/premium')}>
              Passer Premium
            </button>
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        className="profile-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14 }}
      >
        <h2 className="profile-section-title">Mes stats</h2>
        <div className="profile-stats-grid">
          <StatCard icon="wheel"   value={user.stats?.totalGames || 0}                    label="Parties" />
          <StatCard icon="check"   value={user.stats?.totalChallengesCompleted || 0}       label="Réussis" />
          <StatCard icon="cross"   value={user.stats?.totalChallengesRefused || 0}         label="Refusés" />
          <StatCard icon="trophy"  value={
            user.stats?.totalChallengesCompleted
              ? Math.round(user.stats.totalChallengesCompleted /
                  Math.max(1, user.stats.totalChallengesCompleted + user.stats.totalChallengesRefused) * 100) + '%'
              : '—'
          } label="Réussite" />
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="profile-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h2 className="profile-section-title">Raccourcis</h2>
        <div className="profile-actions">
          <button className="profile-action-btn" onClick={() => navigate('/history')}>
            <Icon name="photo" size={20} />
            <span>Historique des parties</span>
            <span className="profile-action-arrow">→</span>
          </button>
          <button className="profile-action-btn" onClick={() => navigate('/packs')}>
            <Icon name="wheel" size={20} />
            <span>Les packs de défis</span>
            <span className="profile-action-arrow">→</span>
          </button>
          <button className="profile-action-btn" onClick={() => navigate('/editor')}>
            <Icon name="pencil" size={20} />
            <span>Créer un pack</span>
            <span className="profile-action-arrow">→</span>
          </button>
        </div>
      </motion.div>

      {/* Déconnexion */}
      <button className="btn btn-ghost profile-logout" onClick={handleLogout}>
        Déconnexion
      </button>

    </Layout>
  );
}
