import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import useAuthStore from '../../store/authStore';
import { useCategories } from '../../hooks/useCategories';
import api from '../../services/api';
import './Editor.css';

const INTENSITIES = [
  { level: 1, label: 'Facile', color: '#2DC653' },
  { level: 2, label: 'Moyen', color: '#C9A84C' },
  { level: 3, label: 'Hard',  color: '#E63946' },
];

const FREE_CHALLENGES = 8;
const PREMIUM_MIN = 8;
const PREMIUM_MAX = 24;
const FREE_PACK_LIMIT = 1;

const emptyChallenge = () => ({ text: '', intensity: INTENSITIES[0] });

export default function Editor() {
  const navigate = useNavigate();
  const { id: editingId } = useParams();
  const { user } = useAuthStore();
  const { categories } = useCategories();
  const isPremium = user?.tier === 'premium';
  const isEditMode = Boolean(editingId);
  const minChallenges = isPremium ? PREMIUM_MIN : FREE_CHALLENGES;
  const maxChallenges = isPremium ? PREMIUM_MAX : FREE_CHALLENGES;

  const [packName, setPackName] = useState('');
  const [theme, setTheme] = useState('custom');
  const [coverImage, setCoverImage] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [challenges, setChallenges] = useState(Array.from({ length: FREE_CHALLENGES }, emptyChallenge));
  const [saving, setSaving] = useState(false);
  const [savedPack, setSavedPack] = useState(null);
  const [error, setError] = useState('');
  const [packCount, setPackCount] = useState(null); // null = loading
  const [loadingPack, setLoadingPack] = useState(isEditMode);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (isEditMode) {
      api.get(`/packs/${editingId}`)
        .then(({ data }) => {
          const p = data.pack;
          setPackName(p.name || '');
          setTheme(p.theme || 'custom');
          setCoverImage(p.coverImage || null);
          if (p.challenges?.length) {
            setChallenges(p.challenges.map((c) => ({
              text: c.text,
              intensity: c.intensity || INTENSITIES[0],
            })));
          }
        })
        .catch(() => setError("Impossible de charger ce pack."))
        .finally(() => setLoadingPack(false));
    } else {
      api.get('/packs/me/count')
        .then(({ data }) => setPackCount(data.count))
        .catch(() => setPackCount(0));
    }
  }, [user, navigate, editingId, isEditMode]);

  const updateChallenge = (i, field, value) => {
    setChallenges((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const setIntensity = (i, intensity) => {
    setChallenges((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], intensity };
      return next;
    });
  };

  const addChallenge = () => {
    setChallenges((prev) => (prev.length < maxChallenges ? [...prev, emptyChallenge()] : prev));
  };

  const removeChallenge = (i) => {
    setChallenges((prev) => (prev.length > minChallenges ? prev.filter((_, idx) => idx !== i) : prev));
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCoverImage(data.url);
    } catch {
      setError("Upload de l'image raté. Réessaie !");
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!packName.trim()) { setError('Donne un nom à ton pack, té !'); return; }
    const empty = challenges.filter((c) => !c.text.trim());
    if (empty.length > 0) { setError(`Il manque ${empty.length} défi(s) à remplir !`); return; }

    setSaving(true);
    setError('');
    try {
      const body = {
        name: packName.trim(),
        theme: isPremium ? theme : 'custom',
        challenges: challenges.map((c) => ({
          text: c.text.trim(),
          intensity: c.intensity,
        })),
      };
      if (isPremium) body.coverImage = coverImage || null;

      const { data } = isEditMode
        ? await api.put(`/packs/${editingId}`, body)
        : await api.post('/packs', body);
      setSavedPack(data.pack);
    } catch (err) {
      if (err.response?.data?.code === 'PACK_LIMIT_REACHED') {
        setError('Limite atteinte. Passe Premium pour créer plus de packs.');
      } else {
        setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSavedPack(null);
    setPackName('');
    setTheme('custom');
    setCoverImage(null);
    setChallenges(Array.from({ length: minChallenges }, emptyChallenge));
    setPackCount((c) => (c !== null ? c + 1 : c));
  };

  if (loadingPack) {
    return (
      <Layout className="editor-page">
        <p className="library-loading">Chargement du pack...</p>
      </Layout>
    );
  }

  // Gate Free : déjà 1 pack créé → paywall (uniquement en création, pas en édition)
  if (!isEditMode && packCount !== null && !isPremium && packCount >= FREE_PACK_LIMIT) {
    return (
      <Layout className="editor-page">
        <div className="editor-header">
          <button className="btn-back" onClick={() => navigate(-1)}>← Retour</button>
          <h1 className="editor-title">Créer un Pack</h1>
        </div>
        <motion.div
          className="editor-paywall card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="editor-paywall-icon"><Icon name="lock" size={40} /></div>
          <h2 className="editor-paywall-title">Tu as déjà un pack perso</h2>
          <p className="editor-paywall-desc">
            Le tier Free est limité à {FREE_PACK_LIMIT} pack perso.<br />
            Passe Premium pour en créer autant que tu veux, avec jusqu'à {PREMIUM_MAX} défis,
            des thèmes, une image de couverture et le partage par QR code.
          </p>
          <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => navigate('/premium')}>
            <Icon name="star" size={16} style={{ marginRight: 6 }} />
            Devenir Premium
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/packs')}>
            Voir mes packs
          </button>
        </motion.div>
      </Layout>
    );
  }

  const shareUrl = savedPack?.shareCode
    ? `${window.location.origin}/packs/import/${savedPack.shareCode}`
    : '';

  if (savedPack) {
    return (
      <Layout className="editor-page">
        <motion.div
          className="editor-success card"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring' }}
        >
          <h2 className="editor-success-title">Pack sauvegardé !</h2>
          <p className="editor-success-name">"{savedPack.name}"</p>

          {savedPack.shareCode ? (
            <>
              <p className="editor-share-label">Partage ce QR code avec tes amis :</p>
              <div className="editor-qr">
                <QRCodeSVG value={shareUrl} size={200} fgColor="#0057A8" bgColor="white" level="H" />
              </div>
              <div className="editor-share-link">
                <span className="editor-share-code">Code : {savedPack.shareCode}</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                >
                  Copier le lien
                </button>
              </div>
            </>
          ) : (
            <div className="editor-upsell-card">
              <p className="editor-upsell-title">Garde ton pack pour toi 🔒</p>
              <p className="editor-upsell-desc">
                Le partage par QR code est réservé aux membres Premium.
              </p>
              <button className="btn btn-gold btn-sm" onClick={() => navigate('/premium')}>
                <Icon name="star" size={14} style={{ marginRight: 6 }} />
                Débloquer le partage
              </button>
            </div>
          )}

          <div className="editor-success-actions">
            <button className="btn btn-gold" onClick={() => navigate('/session/setup')}>
              Jouer avec ce pack
            </button>
            <button className="btn btn-ghost" onClick={() => navigate('/packs')}>
              Voir mes packs
            </button>
            <button className="btn btn-ghost btn-sm" onClick={resetForm}>
              Créer un autre pack
            </button>
          </div>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout className="editor-page">
      <div className="editor-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Retour</button>
        <h1 className="editor-title">{isEditMode ? 'Modifier le Pack' : 'Créer un Pack'}</h1>
        <p className="editor-subtitle">
          {isPremium
            ? `${PREMIUM_MIN} à ${PREMIUM_MAX} défis, ton style, tes règles`
            : `${FREE_CHALLENGES} défis, ton style`}
        </p>
      </div>

      {!isPremium && (
        <motion.div
          className="editor-tier-banner"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Icon name="lock" size={16} />
          <span>
            Tier Free : {FREE_CHALLENGES} défis max, pas de partage. <button
              className="editor-tier-link"
              onClick={() => navigate('/premium')}
            >Passer Premium</button>
          </span>
        </motion.div>
      )}

      <div className="editor-pack-name">
        <input
          className="input"
          type="text"
          placeholder="Nom du pack (ex: Les défis de Mouloud)"
          value={packName}
          onChange={(e) => setPackName(e.target.value)}
          maxLength={40}
        />
      </div>

      {isPremium && (
        <>
          <div className="editor-section">
            <label className="editor-section-label">Thème</label>
            <div className="editor-theme-picker">
              {categories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  className={`editor-theme-btn ${theme === c.slug ? 'active' : ''}`}
                  onClick={() => setTheme(c.slug)}
                >
                  <Icon name={c.icon} size={18} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="editor-section">
            <label className="editor-section-label">Image de couverture (optionnel)</label>
            {coverImage ? (
              <div className="editor-cover-preview">
                <img src={coverImage} alt="cover" />
                <button className="btn btn-ghost btn-sm" onClick={() => setCoverImage(null)}>
                  Retirer
                </button>
              </div>
            ) : (
              <label className="editor-cover-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  style={{ display: 'none' }}
                />
                {uploadingCover ? (
                  <span>Upload...</span>
                ) : (
                  <>
                    <Icon name="camera" size={18} />
                    <span>Choisir une image</span>
                  </>
                )}
              </label>
            )}
          </div>
        </>
      )}

      <div className="editor-challenges">
        {challenges.map((c, i) => (
          <motion.div
            key={i}
            className="editor-challenge-row card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="editor-challenge-header">
              <span className="editor-case-num" style={{ color: c.intensity.color }}>
                Case {i + 1}
              </span>
              <div className="editor-intensity-picker">
                {INTENSITIES.map((int) => (
                  <button
                    key={int.level}
                    className={`intensity-btn ${c.intensity.level === int.level ? 'active' : ''}`}
                    style={{
                      '--int-color': int.color,
                      borderColor: c.intensity.level === int.level ? int.color : 'transparent',
                      background: c.intensity.level === int.level ? int.color : 'transparent',
                    }}
                    onClick={() => setIntensity(i, int)}
                  >
                    {int.label}
                  </button>
                ))}
              </div>
              {isPremium && challenges.length > minChallenges && (
                <button
                  type="button"
                  onClick={() => removeChallenge(i)}
                  aria-label="Supprimer ce défi"
                  className="editor-remove-btn"
                >
                  ✕
                </button>
              )}
            </div>
            <textarea
              className="input editor-textarea"
              placeholder={`Défi ${i + 1}...`}
              value={c.text}
              onChange={(e) => updateChallenge(i, 'text', e.target.value)}
              rows={2}
              maxLength={200}
            />
            <span className="editor-char-count">{c.text.length}/200</span>
          </motion.div>
        ))}

        {isPremium && challenges.length < maxChallenges && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={addChallenge}
            style={{ width: '100%', marginTop: 8 }}
          >
            + Ajouter un défi ({challenges.length}/{maxChallenges})
          </button>
        )}

        {!isPremium && (
          <button
            type="button"
            className="editor-locked-add"
            onClick={() => navigate('/premium')}
          >
            <Icon name="lock" size={14} />
            Plus de défis (jusqu'à {PREMIUM_MAX}) avec Premium
          </button>
        )}
      </div>

      {error && <p className="editor-error">{error}</p>}

      <button
        className="btn btn-gold"
        style={{ width: '100%', padding: '18px', fontSize: '1.1rem', marginTop: 'auto' }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Sauvegarde...' : (isEditMode ? 'Mettre à jour le pack' : 'Sauvegarder le pack')}
      </button>
    </Layout>
  );
}
