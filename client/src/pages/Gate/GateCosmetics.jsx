import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import RoulettePreview from '../../components/RoulettePreview/RoulettePreview';
import { fumigenesVariants } from '../../styles/motion';
import { invalidateCosmetics } from '../../hooks/useActiveSkin';
import api from '../../services/api';
import './GatePacks.css';
import './GateCosmetics.css';

const CATEGORIES = [
  { value: 'roulette', label: 'Skin de roulette' },
  { value: 'needle', label: 'Aiguille' },
  { value: 'cochonnet', label: 'Cochonnet' },
  { value: 'avatar-frame', label: 'Cadre avatar' },
  { value: 'badge', label: 'Badge' },
  { value: 'background', label: 'Fond d\'app' },
  { value: 'sound-pack', label: 'Pack sonore' },
  { value: 'endgame-anim', label: 'Animation EndGame' },
];

const DEFAULT_METALS = [
  { hi: '#6898c8', base: '#3d6080', lo: '#1c3a52' },
  { hi: '#c89038', base: '#8a5f20', lo: '#4a2c08' },
  { hi: '#2a5a8a', base: '#1a3a5c', lo: '#0a1e30' },
  { hi: '#d4a828', base: '#8a6810', lo: '#4a3808' },
  { hi: '#4a7890', base: '#2d4d68', lo: '#122030' },
  { hi: '#a86028', base: '#6a3d10', lo: '#3a1a05' },
  { hi: '#1a4568', base: '#0e2840', lo: '#060f18' },
  { hi: '#d8a828', base: '#9a7015', lo: '#5a4008' },
];

function toLocalInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatPrice(cents) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default function GateCosmetics() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('roulette');
  const [priceEuros, setPriceEuros] = useState('2.99');
  const [isActive, setIsActive] = useState(true);
  const [publishAt, setPublishAt] = useState('');
  const [metals, setMetals] = useState(DEFAULT_METALS);
  const [rawAsset, setRawAsset] = useState('{}');

  const refresh = () => {
    setLoading(true);
    api.get('/gate/cosmetics')
      .then(({ data }) => setItems(data.cosmetics || []))
      .catch(() => setError("Impossible de charger les cosmétiques."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const startNew = () => {
    setEditing('new');
    setName('');
    setDescription('');
    setCategory('roulette');
    setPriceEuros('2.99');
    setIsActive(true);
    setPublishAt('');
    setMetals(DEFAULT_METALS);
    setRawAsset('{}');
    setError('');
  };

  const startEdit = (c) => {
    setEditing(c._id);
    setName(c.name);
    setDescription(c.description || '');
    setCategory(c.category);
    setPriceEuros((c.priceCents / 100).toFixed(2));
    setIsActive(c.isActive !== false);
    setPublishAt(c.publishAt ? toLocalInputValue(c.publishAt) : '');
    if (c.category === 'roulette' && Array.isArray(c.asset?.metals) && c.asset.metals.length === 8) {
      setMetals(c.asset.metals);
      setRawAsset('{}');
    } else {
      setMetals(DEFAULT_METALS);
      setRawAsset(JSON.stringify(c.asset || {}, null, 2));
    }
    setError('');
  };

  const cancelEdit = () => { setEditing(null); setError(''); };

  const updateMetal = (i, key, value) => {
    setMetals((prev) => prev.map((m, idx) => idx === i ? { ...m, [key]: value } : m));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Nom requis.'); return; }
    const priceCents = Math.round(parseFloat(priceEuros) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) { setError('Prix invalide.'); return; }

    let asset;
    if (category === 'roulette') {
      asset = { metals };
    } else {
      try { asset = JSON.parse(rawAsset || '{}'); }
      catch { setError('Asset JSON invalide.'); return; }
    }

    setSaving(true);
    setError('');
    const body = {
      name: name.trim(),
      description: description.trim(),
      category,
      priceCents,
      asset,
      isActive,
      publishAt: publishAt ? new Date(publishAt).toISOString() : null,
    };

    try {
      if (editing === 'new') {
        await api.post('/gate/cosmetics', body);
      } else {
        await api.put(`/gate/cosmetics/${editing}`, body);
      }
      invalidateCosmetics();
      cancelEdit();
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await api.delete(`/gate/cosmetics/${deleteItem._id}`);
      invalidateCosmetics();
      setDeleteItem(null);
      refresh();
    } catch { /* keep open */ }
    finally { setDeleting(false); }
  };

  if (editing) {
    const minDateTime = toLocalInputValue(new Date(Date.now() + 60000));
    return (
      <Layout className="gate-page">
        <div className="gate-header">
          <button className="btn-back" onClick={cancelEdit}>← Annuler</button>
          <h1 className="gate-title">
            {editing === 'new' ? 'Nouveau cosmétique' : 'Modifier le cosmétique'}
          </h1>
          <p className="gate-subtitle">Stripe Product + Price créés/synchronisés automatiquement.</p>
        </div>

        <input
          className="input"
          type="text"
          placeholder="Nom (ex: Vélodrome)"
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
          <label className="gate-label">Catégorie</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="gate-section">
          <label className="gate-label">Prix (€)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={priceEuros}
            onChange={(e) => setPriceEuros(e.target.value)}
          />
        </div>

        <div className="gate-section">
          <label className="gate-label">Statut</label>
          <div className="gate-tier-toggle">
            <button type="button" className={`gate-tier-btn ${isActive ? 'active' : ''}`} onClick={() => setIsActive(true)}>Actif</button>
            <button type="button" className={`gate-tier-btn ${!isActive ? 'active' : ''}`} onClick={() => setIsActive(false)}>Désactivé</button>
          </div>
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
              <button className="btn btn-ghost btn-sm" onClick={() => setPublishAt('')}>Effacer</button>
            )}
          </div>
        </div>

        {category === 'roulette' ? (
          <div className="gate-section">
            <label className="gate-label">Palette (8 tranches × 3 teintes)</label>
            <div className="cos-preview-row">
              <RoulettePreview palette={metals} size={150} />
              <p className="gate-hint">Aperçu en direct selon les couleurs ci-dessous.</p>
            </div>
            <div className="cos-metals-grid">
              {metals.map((m, i) => (
                <div key={i} className="cos-metal-row">
                  <span className="cos-metal-label">#{i + 1}</span>
                  {['hi', 'base', 'lo'].map((k) => (
                    <label key={k} className="cos-color-input">
                      <span>{k === 'hi' ? 'Clair' : k === 'base' ? 'Base' : 'Foncé'}</span>
                      <input
                        type="color"
                        value={m[k]}
                        onChange={(e) => updateMetal(i, k, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="gate-section">
            <label className="gate-label">Asset JSON (libre selon catégorie)</label>
            <textarea
              className="input"
              value={rawAsset}
              onChange={(e) => setRawAsset(e.target.value)}
              rows={6}
              style={{ fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical' }}
            />
            <p className="gate-hint">Saisie libre, sera stocké tel quel. Format à standardiser quand le vecteur sera réellement consommé côté client.</p>
          </div>
        )}

        {error && <p className="gate-error">{error}</p>}

        <button
          className="btn btn-gold"
          style={{ width: '100%', padding: 18, fontSize: '1.1rem', marginTop: 'auto' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Sauvegarde...' : (editing === 'new' ? 'Créer' : 'Mettre à jour')}
        </button>
      </Layout>
    );
  }

  return (
    <Layout className="gate-page">
      <div className="gate-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="gate-title">Cosmétiques</h1>
        <p className="gate-subtitle">Gestion du shop — création, prix, publication</p>
      </div>

      <div className="gate-cross-links">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/gate/packs')}>
          ← Espace Packs
        </button>
      </div>

      <button className="btn btn-gold gate-new-cta" onClick={startNew}>
        <Icon name="star" size={18} style={{ marginRight: 8 }} />
        Nouveau cosmétique
      </button>

      {loading ? (
        <p className="gate-loading">Chargement...</p>
      ) : items.length === 0 ? (
        <p className="gate-empty">Aucun cosmétique pour l'instant.</p>
      ) : (
        <div className="gate-packs-list">
          {items.map((c, i) => {
            const inactive = !c.isActive;
            const scheduled = c.publishAt && new Date(c.publishAt) > new Date();
            return (
              <motion.div
                key={c._id}
                className={`gate-pack-card ${inactive ? 'draft' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {c.category === 'roulette' && c.asset?.metals && (
                  <div className="cos-card-preview">
                    <RoulettePreview palette={c.asset.metals} size={64} />
                  </div>
                )}
                <div className="gate-pack-info">
                  <div className="gate-pack-top">
                    <span className="gate-pack-name">{c.name}</span>
                    <div className="gate-pack-tags">
                      {inactive && <span className="gate-pack-status draft">Désactivé</span>}
                      {scheduled && (
                        <span className="gate-pack-status scheduled">
                          Programmé {new Date(c.publishAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      <span className="gate-pack-tier premium">{formatPrice(c.priceCents)}</span>
                    </div>
                  </div>
                  {c.description && <p className="gate-pack-desc">{c.description}</p>}
                  <div className="gate-pack-meta">
                    <span>{CATEGORIES.find((cc) => cc.value === c.category)?.label || c.category}</span>
                    <span>·</span>
                    <span style={{ fontFamily: 'monospace', textTransform: 'lowercase' }}>{c.slug}</span>
                  </div>
                </div>
                <div className="gate-pack-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Modifier</button>
                  <button className="gate-delete-btn" onClick={() => setDeleteItem(c)}>Désactiver</button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {deleteItem && (
          <motion.div
            className="confirm-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !deleting && setDeleteItem(null)}
          >
            <motion.div
              className="confirm-modal"
              variants={fumigenesVariants}
              initial="initial" animate="animate" exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="confirm-icon-wrap"><Icon name="cross" size={36} /></div>
              <h3 className="confirm-title">Désactiver ce cosmétique ?</h3>
              <p className="confirm-pack-name">"{deleteItem.name}"</p>
              <p className="confirm-desc">
                Le cosmétique sera retiré du shop. Les utilisateurs qui l'ont déjà acheté gardent leur accès.
              </p>
              <div className="confirm-actions">
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={confirmDelete} disabled={deleting}>
                  {deleting ? 'Désactivation...' : 'Oui, désactiver'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteItem(null)} disabled={deleting}>
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
