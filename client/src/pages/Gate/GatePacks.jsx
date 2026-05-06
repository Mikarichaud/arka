import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import { fumigenesVariants } from '../../styles/motion';
import { useCategories, invalidateCategories } from '../../hooks/useCategories';
import api from '../../services/api';
import './GatePacks.css';

const INTENSITIES = [
  { level: 1, label: 'Facile', color: '#2DC653' },
  { level: 2, label: 'Moyen', color: '#C9A84C' },
  { level: 3, label: 'Hard',  color: '#E63946' },
];

// Icônes proposées pour les nouvelles catégories
const ICON_CHOICES = ['anchor', 'party', 'football', 'heart', 'balloon', 'pencil', 'wheel', 'star', 'wave', 'pinch', 'trophy', 'lightning', 'camera', 'photo', 'shuffle'];

const MIN = 8;
const MAX = 24;
const empty = () => ({ text: '', intensity: INTENSITIES[0] });

// Format Date → "YYYY-MM-DDTHH:mm" pour input datetime-local
function toLocalInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GatePacks() {
  const navigate = useNavigate();
  const location = useLocation();
  const { categories } = useCategories();

  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | packId
  const [deletePack, setDeletePack] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Modal catégories
  const [catsOpen, setCatsOpen] = useState(false);
  const [editCat, setEditCat] = useState(null); // null | 'new' | catId
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('wheel');
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState('');
  const [deleteCat, setDeleteCat] = useState(null);
  const [deletingCat, setDeletingCat] = useState(false);

  // Formulaire pack
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('custom');
  const [isPremium, setIsPremium] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [challenges, setChallenges] = useState(Array.from({ length: MIN }, empty));
  const [isActive, setIsActive] = useState(true);
  const [publishAt, setPublishAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const catBySlug = useMemo(() => {
    const m = {};
    for (const c of categories) m[c.slug] = c;
    return m;
  }, [categories]);

  const refresh = () => {
    setLoading(true);
    api.get('/gate/packs')
      .then(({ data }) => setPacks(data.packs))
      .catch(() => setError("Impossible de charger les packs."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  // ─── PACKS ───
  const startNew = () => {
    setEditing('new');
    setName('');
    setDescription('');
    setTheme('custom');
    setIsPremium(false);
    setCoverImage(null);
    setChallenges(Array.from({ length: MIN }, empty));
    setIsActive(true);
    setPublishAt('');
    setError('');
  };

  const startEdit = async (pack) => {
    setEditing(pack._id);
    setError('');
    try {
      const { data } = await api.get(`/gate/packs/${pack._id}`);
      const p = data.pack;
      setName(p.name);
      setDescription(p.description || '');
      setTheme(p.theme || 'custom');
      setIsPremium(Boolean(p.isPremium));
      setCoverImage(p.coverImage || null);
      setIsActive(p.isActive !== false);
      setPublishAt(p.publishAt ? toLocalInputValue(p.publishAt) : '');
      setChallenges(p.challenges?.length
        ? p.challenges.map((c) => ({ text: c.text, intensity: c.intensity || INTENSITIES[0] }))
        : Array.from({ length: MIN }, empty)
      );
    } catch {
      setError("Impossible de charger ce pack.");
    }
  };

  const cancelEdit = () => { setEditing(null); setError(''); };

  const updateChallenge = (i, field, value) => {
    setChallenges((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const addChallenge = () => challenges.length < MAX && setChallenges((p) => [...p, empty()]);
  const removeChallenge = (i) => challenges.length > MIN && setChallenges((p) => p.filter((_, idx) => idx !== i));

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCoverImage(data.url);
    } catch {
      setError("Upload de l'image raté.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Donne un nom au pack.'); return; }
    const emptyCount = challenges.filter((c) => !c.text.trim()).length;
    if (emptyCount > 0) { setError(`Il manque ${emptyCount} défi(s) à remplir.`); return; }

    setSaving(true);
    setError('');
    const body = {
      name: name.trim(),
      description: description.trim(),
      theme,
      isPremium,
      coverImage: coverImage || null,
      isActive,
      publishAt: publishAt ? new Date(publishAt).toISOString() : null,
      challenges: challenges.map((c) => ({ text: c.text.trim(), intensity: c.intensity })),
    };
    try {
      if (editing === 'new') {
        await api.post('/gate/packs', body);
      } else {
        await api.put(`/gate/packs/${editing}`, body);
      }
      cancelEdit();
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletePack) return;
    setDeleting(true);
    try {
      await api.delete(`/gate/packs/${deletePack._id}`);
      setDeletePack(null);
      refresh();
    } catch { /* keep modal open */ }
    finally { setDeleting(false); }
  };

  // ─── CATÉGORIES ───
  const startNewCat = () => {
    setEditCat('new');
    setCatName('');
    setCatIcon('wheel');
    setCatError('');
  };
  const startEditCat = (cat) => {
    setEditCat(cat._id);
    setCatName(cat.name);
    setCatIcon(cat.icon || 'wheel');
    setCatError('');
  };
  const cancelEditCat = () => { setEditCat(null); setCatError(''); };

  const handleSaveCat = async () => {
    if (!catName.trim()) { setCatError('Nom requis.'); return; }
    setCatSaving(true);
    try {
      if (editCat === 'new') {
        await api.post('/gate/categories', { name: catName.trim(), icon: catIcon });
      } else {
        await api.put(`/gate/categories/${editCat}`, { name: catName.trim(), icon: catIcon });
      }
      invalidateCategories();
      cancelEditCat();
    } catch (err) {
      setCatError(err.response?.data?.message || 'Erreur.');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCat = async () => {
    if (!deleteCat) return;
    setDeletingCat(true);
    try {
      await api.delete(`/gate/categories/${deleteCat._id}`);
      invalidateCategories();
      setDeleteCat(null);
    } catch (err) {
      setCatError(err.response?.data?.message || 'Erreur.');
    } finally {
      setDeletingCat(false);
    }
  };

  // ─── RENDU ───
  if (editing) {
    const minDateTime = toLocalInputValue(new Date(Date.now() + 60000));
    const themeIsValid = catBySlug[theme];
    return (
      <Layout className="gate-page">
        <div className="gate-header">
          <button className="btn-back" onClick={cancelEdit}>← Annuler</button>
          <h1 className="gate-title">
            {editing === 'new' ? 'Nouveau pack officiel' : 'Modifier le pack'}
          </h1>
          <p className="gate-subtitle">Espace Gaté — pack visible par tous les joueurs</p>
        </div>

        <input
          className="input"
          type="text"
          placeholder="Nom du pack"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />

        <textarea
          className="input"
          placeholder="Description (1-2 phrases)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={200}
          style={{ resize: 'none' }}
        />

        <div className="gate-section">
          <div className="gate-label-row">
            <label className="gate-label">Catégorie</label>
            <button className="gate-inline-add" onClick={() => { setCatsOpen(true); startNewCat(); }}>
              + Nouvelle catégorie
            </button>
          </div>
          <div className="gate-theme-picker">
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                className={`gate-theme-btn ${theme === c.slug ? 'active' : ''}`}
                onClick={() => setTheme(c.slug)}
              >
                <Icon name={c.icon} size={18} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
          {!themeIsValid && categories.length > 0 && (
            <p className="gate-warn">Thème inconnu, sera ramené à "custom" à la sauvegarde.</p>
          )}
        </div>

        <div className="gate-section">
          <label className="gate-label">Tier</label>
          <div className="gate-tier-toggle">
            <button
              type="button"
              className={`gate-tier-btn ${!isPremium ? 'active' : ''}`}
              onClick={() => setIsPremium(false)}
            >Gratuit</button>
            <button
              type="button"
              className={`gate-tier-btn premium ${isPremium ? 'active' : ''}`}
              onClick={() => setIsPremium(true)}
            >
              <Icon name="star" size={14} style={{ marginRight: 4 }} />
              Premium
            </button>
          </div>
        </div>

        <div className="gate-section">
          <label className="gate-label">Statut</label>
          <div className="gate-tier-toggle">
            <button
              type="button"
              className={`gate-tier-btn ${isActive ? 'active' : ''}`}
              onClick={() => setIsActive(true)}
            >Actif</button>
            <button
              type="button"
              className={`gate-tier-btn ${!isActive ? 'active' : ''}`}
              onClick={() => setIsActive(false)}
            >Brouillon</button>
          </div>
          <p className="gate-hint">Un brouillon n'est jamais visible côté joueurs.</p>
        </div>

        <div className="gate-section">
          <label className="gate-label">Publier à (optionnel)</label>
          <div className="gate-date-row">
            <input
              type="datetime-local"
              className="input"
              value={publishAt}
              min={minDateTime}
              onChange={(e) => setPublishAt(e.target.value)}
            />
            {publishAt && (
              <button className="btn btn-ghost btn-sm" onClick={() => setPublishAt('')}>
                Effacer
              </button>
            )}
          </div>
          <p className="gate-hint">Vide = publié immédiatement (si actif). Date future = caché jusqu'à cette date.</p>
        </div>

        <div className="gate-section">
          <label className="gate-label">Image de couverture (optionnel)</label>
          {coverImage ? (
            <div className="gate-cover-preview">
              <img src={coverImage} alt="cover" />
              <button className="btn btn-ghost btn-sm" onClick={() => setCoverImage(null)}>Retirer</button>
            </div>
          ) : (
            <label className="gate-cover-upload">
              <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
              {uploadingCover ? 'Upload...' : <><Icon name="camera" size={18} /><span>Choisir une image</span></>}
            </label>
          )}
        </div>

        <div className="gate-challenges">
          <label className="gate-label">Défis ({challenges.length}/{MAX})</label>
          {challenges.map((c, i) => (
            <div key={i} className="gate-challenge-row card">
              <div className="gate-challenge-header">
                <span className="gate-case-num" style={{ color: c.intensity.color }}>Case {i + 1}</span>
                <div className="gate-intensity-picker">
                  {INTENSITIES.map((int) => (
                    <button
                      key={int.level}
                      className={`intensity-btn ${c.intensity.level === int.level ? 'active' : ''}`}
                      style={{
                        '--int-color': int.color,
                        borderColor: c.intensity.level === int.level ? int.color : 'transparent',
                        background: c.intensity.level === int.level ? int.color : 'transparent',
                      }}
                      onClick={() => updateChallenge(i, 'intensity', int)}
                    >
                      {int.label}
                    </button>
                  ))}
                </div>
                {challenges.length > MIN && (
                  <button onClick={() => removeChallenge(i)} className="gate-remove-btn">✕</button>
                )}
              </div>
              <textarea
                className="input"
                placeholder={`Défi ${i + 1}...`}
                value={c.text}
                onChange={(e) => updateChallenge(i, 'text', e.target.value)}
                rows={2}
                maxLength={200}
                style={{ resize: 'none' }}
              />
            </div>
          ))}
          {challenges.length < MAX && (
            <button className="btn btn-ghost" onClick={addChallenge} style={{ width: '100%' }}>
              + Ajouter un défi
            </button>
          )}
        </div>

        {error && <p className="gate-error">{error}</p>}

        <button
          className="btn btn-gold"
          style={{ width: '100%', padding: 18, fontSize: '1.1rem', marginTop: 'auto' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Sauvegarde...' : (editing === 'new' ? 'Publier le pack' : 'Mettre à jour')}
        </button>

        {/* Modale Nouvelle catégorie (depuis l'éditeur de pack) */}
        <CategoryFormModal
          open={Boolean(editCat)}
          mode={editCat === 'new' ? 'new' : 'edit'}
          name={catName}
          icon={catIcon}
          saving={catSaving}
          error={catError}
          onChangeName={setCatName}
          onChangeIcon={setCatIcon}
          onCancel={cancelEditCat}
          onSave={handleSaveCat}
        />
      </Layout>
    );
  }

  // Vue liste
  return (
    <Layout className="gate-page">
      <div className="gate-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="gate-title">Espace Gaté — Packs</h1>
        <p className="gate-subtitle">Création et gestion des packs officiels et catégories</p>
      </div>

      <div className="gate-cross-links">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/gate/cosmetics')}>
          → Cosmétiques
        </button>
      </div>

      {/* Section Catégories repliable */}
      <div className="gate-cats-section">
        <button className="gate-cats-toggle" onClick={() => setCatsOpen((o) => !o)}>
          <span><Icon name="wheel" size={16} style={{ marginRight: 8 }} />Catégories ({categories.length})</span>
          <span>{catsOpen ? '▲' : '▼'}</span>
        </button>
        {catsOpen && (
          <motion.div
            className="gate-cats-list"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {categories.map((c) => (
              <div key={c._id} className="gate-cat-row">
                <Icon name={c.icon} size={18} />
                <span className="gate-cat-name">{c.name}</span>
                <span className="gate-cat-slug">{c.slug}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => startEditCat(c)}>Modifier</button>
                {c.slug !== 'custom' && (
                  <button className="gate-delete-btn" onClick={() => setDeleteCat(c)}>Supprimer</button>
                )}
              </div>
            ))}
            <button className="btn btn-gold btn-sm" onClick={startNewCat} style={{ marginTop: 8 }}>
              + Nouvelle catégorie
            </button>
          </motion.div>
        )}
      </div>

      <button className="btn btn-gold gate-new-cta" onClick={startNew}>
        <Icon name="pencil" size={18} style={{ marginRight: 8 }} />
        Nouveau pack officiel
      </button>

      {loading ? (
        <p className="gate-loading">Chargement...</p>
      ) : packs.length === 0 ? (
        <p className="gate-empty">Aucun pack officiel pour l'instant.</p>
      ) : (
        <div className="gate-packs-list">
          {packs.map((p, i) => {
            const isDraft = !p.isActive;
            const scheduled = p.publishAt && new Date(p.publishAt) > new Date();
            return (
              <motion.div
                key={p._id}
                className={`gate-pack-card ${p.isPremium ? 'premium' : ''} ${isDraft ? 'draft' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="gate-pack-info">
                  <div className="gate-pack-top">
                    <span className="gate-pack-name">{p.name}</span>
                    <div className="gate-pack-tags">
                      {isDraft && <span className="gate-pack-status draft">Brouillon</span>}
                      {scheduled && (
                        <span className="gate-pack-status scheduled">
                          Programmé {new Date(p.publishAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span className={`gate-pack-tier ${p.isPremium ? 'premium' : ''}`}>
                        {p.isPremium ? 'Premium' : 'Gratuit'}
                      </span>
                    </div>
                  </div>
                  {p.description && <p className="gate-pack-desc">{p.description}</p>}
                  <div className="gate-pack-meta">
                    <Icon name={catBySlug[p.theme]?.icon || 'wheel'} size={12} />
                    <span>{catBySlug[p.theme]?.name || p.theme}</span>
                    <span>·</span>
                    <span>{p.challenges?.length || 0} défis</span>
                  </div>
                </div>
                <div className="gate-pack-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>Modifier</button>
                  <button className="gate-delete-btn" onClick={() => setDeletePack(p)}>Supprimer</button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <AnimatePresence>
        {deletePack && (
          <motion.div
            className="confirm-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !deleting && setDeletePack(null)}
          >
            <motion.div
              className="confirm-modal"
              variants={fumigenesVariants}
              initial="initial" animate="animate" exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="confirm-icon-wrap"><Icon name="cross" size={36} /></div>
              <h3 className="confirm-title">Supprimer ce pack officiel ?</h3>
              <p className="confirm-pack-name">"{deletePack.name}"</p>
              <p className="confirm-desc">Tous les défis seront perdus. C'est définitif.</p>
              <div className="confirm-actions">
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={confirmDelete} disabled={deleting}>
                  {deleting ? 'Suppression...' : 'Oui, supprimer'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDeletePack(null)} disabled={deleting}>
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {deleteCat && (
          <motion.div
            className="confirm-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !deletingCat && setDeleteCat(null)}
          >
            <motion.div
              className="confirm-modal"
              variants={fumigenesVariants}
              initial="initial" animate="animate" exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="confirm-icon-wrap"><Icon name="cross" size={36} /></div>
              <h3 className="confirm-title">Supprimer cette catégorie ?</h3>
              <p className="confirm-pack-name">{deleteCat.name}</p>
              <p className="confirm-desc">Bloqué si des packs l'utilisent encore.</p>
              {catError && <p className="gate-error">{catError}</p>}
              <div className="confirm-actions">
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleDeleteCat} disabled={deletingCat}>
                  {deletingCat ? 'Suppression...' : 'Oui, supprimer'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteCat(null)} disabled={deletingCat}>
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modale catégorie (création/édition) */}
      <CategoryFormModal
        open={Boolean(editCat)}
        mode={editCat === 'new' ? 'new' : 'edit'}
        name={catName}
        icon={catIcon}
        saving={catSaving}
        error={catError}
        onChangeName={setCatName}
        onChangeIcon={setCatIcon}
        onCancel={cancelEditCat}
        onSave={handleSaveCat}
      />
    </Layout>
  );
}

function CategoryFormModal({ open, mode, name, icon, saving, error, onChangeName, onChangeIcon, onCancel, onSave }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="confirm-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => !saving && onCancel()}
        >
          <motion.div
            className="confirm-modal gate-cat-modal"
            variants={fumigenesVariants}
            initial="initial" animate="animate" exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="confirm-title">
              {mode === 'new' ? 'Nouvelle catégorie' : 'Modifier la catégorie'}
            </h3>
            <input
              className="input"
              placeholder="Nom (ex: Fada)"
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              maxLength={30}
            />
            <label className="gate-label" style={{ alignSelf: 'flex-start' }}>Icône</label>
            <div className="gate-icon-grid">
              {ICON_CHOICES.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  className={`gate-icon-choice ${icon === ic ? 'active' : ''}`}
                  onClick={() => onChangeIcon(ic)}
                >
                  <Icon name={ic} size={22} />
                </button>
              ))}
            </div>
            {error && <p className="gate-error">{error}</p>}
            <div className="confirm-actions">
              <button className="btn btn-gold" style={{ width: '100%' }} onClick={onSave} disabled={saving}>
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
                Annuler
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
