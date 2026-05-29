import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import CosmeticCard from '../../components/CosmeticCard/CosmeticCard';
import ProvenanceBadge from '../../components/ProvenanceBadge/ProvenanceBadge';
import useAuthStore from '../../store/authStore';
import useAuthModalStore from '../../store/authModalStore';
import { invalidateCosmetics } from '../../hooks/useActiveSkin';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { openLegal } from '../../native';
import { fumigenesVariants } from '../../styles/motion';
import { FEATURES_UNLOCKED, STORE_BUILD } from '../../utils/permissions';
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
  const editable = isPremium || FEATURES_UNLOCKED;

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
  const { user, setUser, logout } = useAuthStore();
  const openAuthModal = useAuthModalStore((s) => s.open);
  const [sub, setSub] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [ownedCosmetics, setOwnedCosmetics] = useState([]);
  const [activatingSlug, setActivatingSlug] = useState(null);

  // Mode édition de la carte d'identité (avatar + pseudo + email + code postal)
  const [editingProfile, setEditingProfile] = useState(false);
  const [pseudoDraft, setPseudoDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [postalDraft, setPostalDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEscapeClose(showDelete, () => { if (!deleting) setShowDelete(false); });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!FEATURES_UNLOCKED) {
      api.get('/payments/subscription')
        .then(({ data }) => setSub(data))
        .catch(() => {});
    }
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

  const startEditProfile = () => {
    setPseudoDraft(user?.username || '');
    setEmailDraft(user?.email || '');
    setPostalDraft(user?.postalCode || '');
    setProfileError('');
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditingProfile(false);
    setProfileError('');
  };

  const saveProfile = async () => {
    const pseudo = pseudoDraft.trim();
    const postal = postalDraft.trim();
    const email = emailDraft.trim().toLowerCase();
    if (!pseudo) { setProfileError('Mets un pseudo, té !'); return; }
    if (postal && !/^\d{5}$/.test(postal)) { setProfileError('Code postal : 5 chiffres, té.'); return; }

    // Champs non sensibles (pseudo + code postal) : PUT direct.
    const updates = {};
    if (pseudo !== user.username) updates.username = pseudo;
    if (postal !== (user.postalCode || '')) updates.postalCode = postal || null;

    const emailChanged = email && email !== user.email;

    setSavingProfile(true);
    setProfileError('');
    try {
      if (Object.keys(updates).length > 0) {
        const { data } = await api.put(`/users/${user._id}`, updates);
        setUser(data.user);
      }
      setEditingProfile(false);
      // Email sensible (sert au reset password) → re-auth par mot de passe via modale.
      if (emailChanged) openAuthModal('changeEmail', { payload: { newEmail: email } });
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Ça a pas marché, réessaie.');
    } finally {
      setSavingProfile(false);
    }
  };

  const onPseudoKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveProfile(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEditProfile(); }
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

  if (!user) return null;

  const isPremium = sub?.isPremiumActive || user?.tier === 'premium';
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const isCanceling = isPremium && sub?.cancelAtPeriodEnd;

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete('/users/me');
      logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Erreur lors de la suppression. Réessaie, té.');
      setDeleting(false);
    }
  };

  return (
    <Layout className="profile-page">

      <div className="profile-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="profile-title">Mon Profil</h1>
      </div>

      {/* Identité — affichage ou mode édition de la carte */}
      <motion.div
        className={`profile-identity card ${editingProfile ? 'is-editing' : ''}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          className="profile-edit-card-btn"
          onClick={editingProfile ? cancelEditProfile : startEditProfile}
          title={editingProfile ? 'Fermer' : 'Modifier mes infos'}
          aria-label={editingProfile ? 'Fermer' : 'Modifier mes infos'}
        >
          <Icon name={editingProfile ? 'cross' : 'pencil'} size={16} />
        </button>

        <Avatar
          user={user}
          isPremium={isPremium}
          onUpload={handleAvatarUpload}
          uploading={uploadingAvatar}
        />

        <div className="profile-identity-info">
          {editingProfile ? (
            <>
              <span className="profile-edit-label">Modifier mes infos</span>
              <div className="profile-edit-field">
                <label>Pseudo</label>
                <input
                  className="input profile-edit-input"
                  value={pseudoDraft}
                  onChange={(e) => setPseudoDraft(e.target.value)}
                  onKeyDown={onPseudoKeyDown}
                  maxLength={30}
                  autoFocus
                  disabled={savingProfile}
                  placeholder="Ton pseudo"
                  aria-label="Pseudo"
                />
              </div>
              <div className="profile-edit-field">
                <label>Email</label>
                <input
                  className="input profile-edit-input"
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  disabled={savingProfile}
                  placeholder="ton@email.fr"
                  aria-label="Email"
                />
              </div>
              <div className="profile-edit-field">
                <label>Code postal</label>
                <input
                  className="input profile-edit-input"
                  value={postalDraft}
                  onChange={(e) => setPostalDraft(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  inputMode="numeric"
                  maxLength={5}
                  disabled={savingProfile}
                  placeholder="Code postal"
                  aria-label="Code postal"
                />
              </div>
              {profileError && <span className="profile-pseudo-error">{profileError}</span>}
              <div className="profile-edit-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={cancelEditProfile}
                  disabled={savingProfile}
                >Annuler</button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={saveProfile}
                  disabled={savingProfile}
                >{savingProfile ? '...' : 'Enregistrer'}</button>
              </div>
            </>
          ) : (
            <>
              <span className="profile-username">
                {user.username}
                {isPremium && !FEATURES_UNLOCKED && <Icon name="star" size={16} style={{ marginLeft: 4 }} />}
              </span>
              <span className="profile-email">{user.email}</span>
              {user.postalCode && (
                <ProvenanceBadge postalCode={user.postalCode} size={15} />
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Abonnement — masqué en mode lancement ET sur le build magasin (App Store 3.1.1) */}
      {!FEATURES_UNLOCKED && !STORE_BUILD && (
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
      )}

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
          </div>
        ) : (
          <div className="profile-cosmetics-grid">
            {ownedCosmetics.map((c, i) => {
              const isActive = user?.activeSkins?.[c.category] === c.slug;
              return (
                <CosmeticCard
                  key={c._id}
                  cosmetic={c}
                  layout="horizontal"
                  active={isActive}
                  activating={activatingSlug === c.slug}
                  onActivate={(cos) => handleActivateSkin(cos.category, cos.slug)}
                  categoryLabel={COSMETIC_CAT_LABELS[c.category] || c.category}
                  index={i}
                />
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

      {/* Raccourcis */}
      <motion.div
        className="profile-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h2 className="profile-section-title">Raccourcis</h2>
        <div className="profile-tiles">
          <button className="profile-tile" onClick={() => navigate('/history')}>
            <Icon name="photo" size={24} />
            <span>Historique</span>
          </button>
          <button className="profile-tile" onClick={() => navigate('/packs')}>
            <Icon name="wheel" size={24} />
            <span>Packs</span>
          </button>
          <button className="profile-tile" onClick={() => navigate('/editor')}>
            <Icon name="pencil" size={24} />
            <span>Créer un pack</span>
          </button>
        </div>

        {user.role === 'gate' && (
          <div className="profile-gate-row">
            <button className="profile-gate-pill" onClick={() => navigate('/gate/packs')}>
              <Icon name="star" size={16} />
              <span>Gaté — Packs</span>
            </button>
            <button className="profile-gate-pill" onClick={() => navigate('/gate/cosmetics')}>
              <Icon name="star" size={16} />
              <span>Gaté — Cosmétiques</span>
            </button>
          </div>
        )}

        {user.isOwner && (
          <div className="profile-gate-row">
            <button className="profile-gate-pill profile-gate-pill--owner" onClick={() => navigate('/admin')}>
              <Icon name="lightning" size={16} />
              <span>Le café du commerce (admin)</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Mon compte */}
      <motion.div
        className="profile-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
      >
        <h2 className="profile-section-title">Mon compte</h2>
        <div className="profile-account-actions">
          <button className="btn btn-ghost" onClick={() => openAuthModal('changePassword')}>
            <Icon name="lock" size={16} style={{ marginRight: 8 }} />
            Changer mon mot de passe
          </button>
          <button className="btn btn-ghost profile-delete-trigger" onClick={() => setShowDelete(true)}>
            <Icon name="cross" size={16} style={{ marginRight: 8 }} />
            Supprimer mon compte
          </button>
        </div>
      </motion.div>

      {/* Déconnexion */}
      <button className="btn btn-ghost profile-logout" onClick={() => openAuthModal('logout')}>
        Déconnexion
      </button>

      <div className="profile-legal-links">
        <a href="/terms" onClick={(e) => { e.preventDefault(); openLegal('/terms'); }}>CGU</a>
        <span>·</span>
        <a href="/privacy" onClick={(e) => { e.preventDefault(); openLegal('/privacy'); }}>Confidentialité</a>
      </div>

      {/* Modale de confirmation suppression de compte */}
      <AnimatePresence>
        {showDelete && (
          <motion.div
            className="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !deleting && setShowDelete(false)}
          >
            <motion.div
              className="confirm-modal"
              variants={fumigenesVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="confirm-icon-wrap">
                <Icon name="cross" size={36} />
              </div>
              <h3 className="confirm-title">Supprimer ton compte ?</h3>
              <p className="confirm-desc">
                Tout part : ton profil, tes packs persos, tes parties et galeries, et tes salons
                hébergés. C'est définitif et irréversible, oh fada — aucun retour en arrière possible.
              </p>
              {deleteError && <p className="profile-pseudo-error">{deleteError}</p>}
              <div className="confirm-actions">
                <button
                  className="btn btn-danger"
                  style={{ width: '100%' }}
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? 'Suppression...' : 'Oui, supprimer définitivement'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowDelete(false)}
                  disabled={deleting}
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </Layout>
  );
}
