import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import RoulettePreview from '../../components/RoulettePreview/RoulettePreview';
import useAuthStore from '../../store/authStore';
import { invalidateCosmetics } from '../../hooks/useActiveSkin';
import api from '../../services/api';
import './Profile.css';

const COSMETIC_CAT_LABELS = {
  roulette: 'Roulette',
  needle: 'Aiguille',
  cochonnet: 'Cochonnet',
  'avatar-frame': 'Cadre avatar',
  badge: 'Badge',
  background: 'Fond d\'app',
  'sound-pack': 'Pack sonore',
  'endgame-anim': 'Animation EndGame',
};

function Avatar({ user, isPremium, onUpload, uploading }) {
  const inputRef = useRef(null);
  const initials = (user?.username || '?').slice(0, 2).toUpperCase();
  const editable = isPremium;

  return (
    <div
      className={`profile-avatar-wrap ${editable ? 'editable' : ''}`}
      onClick={() => editable && inputRef.current?.click()}
      title={editable ? 'Changer ma photo' : null}
    >
      {user?.avatar ? (
        <img src={user.avatar} alt="avatar" className="profile-avatar-img" />
      ) : (
        <div className="profile-avatar">{initials}</div>
      )}
      {uploading && <div className="profile-avatar-overlay"><span className="profile-avatar-spinner" /></div>}
      {editable && !uploading && (
        <div className="profile-avatar-edit">
          <Icon name="camera" size={14} />
        </div>
      )}
      {editable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onUpload}
        />
      )}
    </div>
  );
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
  const location = useLocation();
  const { user, logout, setUser } = useAuthStore();
  const [sub, setSub] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [ownedCosmetics, setOwnedCosmetics] = useState([]);
  const [activatingSlug, setActivatingSlug] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/payments/subscription')
      .then(({ data }) => setSub(data))
      .catch(() => {});
    // Rafraîchit le user depuis le serveur
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {});
    // Charge les cosmétiques pour résoudre les slugs en objets complets
    api.get('/cosmetics')
      .then(({ data }) => setOwnedCosmetics(data.cosmetics?.filter((c) => c.owned) || []))
      .catch(() => {});
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const upload = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { data } = await api.put(`/users/${user._id}`, { avatar: upload.data.url });
      setUser(data.user);
    } catch {
      // silencieux
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await api.post('/payments/portal');
      window.location.href = data.url;
    } catch {
      setPortalLoading(false);
    }
  };

  const handleActivateSkin = async (category, slug) => {
    if (!user) return;
    const currentSlug = user.activeSkins?.[category];
    const targetSlug = currentSlug === slug ? null : slug; // re-clic = désactivation
    setActivatingSlug(slug);
    try {
      const { data } = await api.put('/users/me/active-skin', { category, slug: targetSlug });
      setUser(data.user);
      invalidateCosmetics();
    } catch {
      // silencieux
    } finally {
      setActivatingSlug(null);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  if (!user) return null;

  const isPremium = sub?.isPremiumActive || user?.tier === 'premium';
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const isCanceling = isPremium && sub?.cancelAtPeriodEnd;

  return (
    <Layout className="profile-page">

      <div className="profile-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="profile-title">Mon Profil</h1>
      </div>

      {/* Identité */}
      <motion.div
        className="profile-identity card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Avatar
          user={user}
          isPremium={isPremium}
          onUpload={handleAvatarUpload}
          uploading={uploadingAvatar}
        />
        <div className="profile-identity-info">
          <span className="profile-username">
            {user.username}
            {isPremium && <Icon name="star" size={16} style={{ marginLeft: 8 }} />}
          </span>
          <span className="profile-email">{user.email}</span>
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
          <div className={`profile-sub-card card premium ${isCanceling ? 'canceling' : ''}`}>
            <div className="profile-sub-info">
              <Icon name="star" size={20} />
              <div>
                <p className="profile-sub-status">
                  {isCanceling ? 'Premium — annulation programmée' : 'Premium actif'}
                </p>
                {periodEnd && (
                  <p className="profile-sub-date">
                    {isCanceling ? `Fin de l'abonnement le ${periodEnd}` : `Renouvellement le ${periodEnd}`}
                  </p>
                )}
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

        {isCanceling && (
          <motion.p
            className="profile-cancel-msg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Aïe, dommage ! C'est un sucre d'être Premium, un vrai monstre. Sans toi, c'est plus le poulet ici. Tu peux toujours te raviser jusqu'au {periodEnd}.
          </motion.p>
        )}
      </motion.div>

      {/* Cosmétiques */}
      <motion.div
        className="profile-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.11 }}
      >
        <div className="profile-cosmetics-header">
          <h2 className="profile-section-title">Mes cosmétiques</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/packs?tab=cosmetics')}>
            Boutique →
          </button>
        </div>
        {ownedCosmetics.length === 0 ? (
          <div className="profile-cosmetics-empty">
            <p>Pas encore de cosmétique. Visite la boutique pour personnaliser ta roulette.</p>
            <button className="btn btn-gold btn-sm" onClick={() => navigate('/packs?tab=cosmetics')}>
              <Icon name="star" size={14} style={{ marginRight: 6 }} />
              Découvrir
            </button>
          </div>
        ) : (
          <div className="profile-cosmetics-grid">
            {ownedCosmetics.map((c) => {
              const isActive = user?.activeSkins?.[c.category] === c.slug;
              return (
                <div key={c._id} className={`profile-cosmetic-card ${isActive ? 'active' : ''}`}>
                  {c.category === 'roulette' && c.asset?.metals && (
                    <RoulettePreview palette={c.asset.metals} size={80} />
                  )}
                  <div className="profile-cosmetic-info">
                    <span className="profile-cosmetic-cat">{COSMETIC_CAT_LABELS[c.category] || c.category}</span>
                    <span className="profile-cosmetic-name">{c.name}</span>
                  </div>
                  <button
                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleActivateSkin(c.category, c.slug)}
                    disabled={activatingSlug === c.slug}
                  >
                    {activatingSlug === c.slug ? '...' : (isActive ? '✓ Actif' : 'Activer')}
                  </button>
                </div>
              );
            })}
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
          <button className="profile-action-btn" onClick={() => navigate('/packs?tab=cosmetics')}>
            <Icon name="star" size={20} />
            <span>La boutique</span>
            <span className="profile-action-arrow">→</span>
          </button>
          {user.role === 'gate' && (
            <>
              <button className="profile-action-btn profile-gate-btn" onClick={() => navigate('/gate/packs')}>
                <Icon name="star" size={20} />
                <span>Gaté — Packs officiels</span>
                <span className="profile-action-arrow">→</span>
              </button>
              <button className="profile-action-btn profile-gate-btn" onClick={() => navigate('/gate/cosmetics')}>
                <Icon name="star" size={20} />
                <span>Gaté — Cosmétiques</span>
                <span className="profile-action-arrow">→</span>
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Déconnexion */}
      <button className="btn btn-ghost profile-logout" onClick={handleLogout}>
        Déconnexion
      </button>

    </Layout>
  );
}
