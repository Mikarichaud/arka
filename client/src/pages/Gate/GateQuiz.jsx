import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import EmptyState from '../../components/EmptyState/EmptyState';
import { fumigenesVariants } from '../../styles/motion';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import api from '../../services/api';
import './GatePacks.css';
import './GateQuiz.css';

const CATEGORIES = [
  { value: 'parler', label: '🗣️ Le parler', chip: 'Parler' },
  { value: 'bouffe', label: '🍽️ La bouffe', chip: 'Bouffe' },
  { value: 'om', label: "🔵 L'OM", chip: 'OM' },
  { value: 'geo', label: '🗺️ La géo', chip: 'Géo' },
  { value: 'culture', label: '🎭 Culture & traditions', chip: 'Culture' },
];
const SCOPES = [{ value: 'exam', label: 'Examen' }, { value: 'trial', label: 'Test blanc' }];
const DIFFICULTIES = [{ value: 'facile', label: 'Facile' }, { value: 'moyen', label: 'Moyen' }, { value: 'difficile', label: 'Difficile' }];
const catLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || v;

// Cibles d'équilibre (cf. spec) : 20 test blanc · 80 examen (40D / 25M / 15F).
const TARGETS = { trial: 20, examFacile: 15, examMoyen: 25, examDifficile: 40 };

export default function GateQuiz() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Filtres (catégorie = multi-sélection)
  const [fCat, setFCat] = useState([]);
  const [fScope, setFScope] = useState('');
  const [fDiff, setFDiff] = useState('');

  // Form
  const [category, setCategory] = useState('parler');
  const [scope, setScope] = useState('exam');
  const [difficulty, setDifficulty] = useState('moyen');
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEscapeClose(Boolean(deleteItem) && !deleting, () => setDeleteItem(null));

  const refresh = () => {
    setLoading(true);
    api.get('/gate/quiz')
      .then(({ data }) => setItems(data.questions || []))
      .catch(() => setError('Impossible de charger les questions.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); }, []);

  const startNew = () => {
    setEditing('new');
    setCategory('parler'); setScope('exam'); setDifficulty('moyen');
    setText(''); setOptions(['', '', '', '']); setCorrectIndex(0); setIsActive(true);
    setError('');
  };
  const startEdit = (q) => {
    setEditing(q._id);
    setCategory(q.category); setScope(q.scope); setDifficulty(q.difficulty);
    setText(q.text);
    setOptions([0, 1, 2, 3].map((i) => q.options[i] || ''));
    setCorrectIndex(q.correctIndex); setIsActive(q.isActive !== false);
    setError('');
  };
  const cancelEdit = () => { setEditing(null); setError(''); };

  const handleSave = async () => {
    if (!text.trim()) { setError('Le texte de la question est requis.'); return; }
    const opts = options.map((o) => o.trim());
    if (opts.some((o) => !o)) { setError('Les 4 propositions sont requises.'); return; }
    setSaving(true); setError('');
    const body = { category, scope, difficulty, text: text.trim(), options: opts, correctIndex, isActive };
    try {
      if (editing === 'new') await api.post('/gate/quiz', body);
      else await api.put(`/gate/quiz/${editing}`, body);
      cancelEdit(); refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de sauvegarde.');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await api.delete(`/gate/quiz/${deleteItem._id}`);
      setDeleteItem(null); refresh();
    } catch { /* keep open */ }
    finally { setDeleting(false); }
  };

  // ---------- FORMULAIRE ----------
  if (editing) {
    return (
      <Layout className="gate-page">
        <div className="gate-header">
          <button className="btn-back" onClick={cancelEdit}>← Annuler</button>
          <h1 className="gate-title">{editing === 'new' ? 'Nouvelle question' : 'Modifier la question'}</h1>
          <p className="gate-subtitle">Banque du Passeport Marseillais. La bonne réponse est mélangée à chaque tirage.</p>
        </div>

        <div className="gate-section">
          <label className="gate-label">Catégorie</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="gate-section">
          <label className="gate-label">Type</label>
          <div className="gate-tier-toggle">
            {SCOPES.map((s) => (
              <button key={s.value} type="button" className={`gate-tier-btn ${scope === s.value ? 'active' : ''}`} onClick={() => setScope(s.value)}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="gate-section">
          <label className="gate-label">Difficulté</label>
          <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        <textarea
          className="input"
          placeholder="Texte de la question"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={300}
          style={{ resize: 'none' }}
        />

        <div className="gate-section">
          <label className="gate-label">Propositions — coche la bonne réponse</label>
          {options.map((opt, i) => (
            <div key={i} className="quiz-opt-row">
              <button
                type="button"
                className={`quiz-opt-radio ${correctIndex === i ? 'is-correct' : ''}`}
                onClick={() => setCorrectIndex(i)}
                title="Marquer comme bonne réponse"
              >
                {correctIndex === i ? '✓' : String.fromCharCode(65 + i)}
              </button>
              <input
                className="input"
                value={opt}
                onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                placeholder={`Proposition ${String.fromCharCode(65 + i)}`}
                maxLength={150}
              />
            </div>
          ))}
        </div>

        <div className="gate-section">
          <label className="gate-label">Statut</label>
          <div className="gate-tier-toggle">
            <button type="button" className={`gate-tier-btn ${isActive ? 'active' : ''}`} onClick={() => setIsActive(true)}>Active</button>
            <button type="button" className={`gate-tier-btn ${!isActive ? 'active' : ''}`} onClick={() => setIsActive(false)}>Retirée</button>
          </div>
        </div>

        {error && <p className="gate-error">{error}</p>}

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: 18, fontSize: '1.1rem', marginTop: 'auto' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Sauvegarde...' : (editing === 'new' ? 'Créer' : 'Mettre à jour')}
        </button>
      </Layout>
    );
  }

  // ---------- LISTE ----------
  const active = items.filter((q) => q.isActive !== false);
  const trialCount = active.filter((q) => q.scope === 'trial').length;
  const examByDiff = { facile: 0, moyen: 0, difficile: 0 };
  active.filter((q) => q.scope === 'exam').forEach((q) => { examByDiff[q.difficulty] += 1; });

  const filtered = items.filter((q) =>
    (!fCat.length || fCat.includes(q.category)) && (!fScope || q.scope === fScope) && (!fDiff || q.difficulty === fDiff));

  const stat = (n, target) => <b className={n >= target ? 'ok' : 'low'}>{n}/{target}</b>;

  const anyFilter = Boolean(fCat.length || fScope || fDiff);
  const clearFilters = () => { setFCat([]); setFScope(''); setFDiff(''); };

  // Filtre simple (un seul actif).
  const chips = (value, set, opts) => (
    <div className="quiz-chips">
      <button type="button" className={`quiz-chip ${!value ? 'active' : ''}`} onClick={() => set('')}>Tout</button>
      {opts.map((o) => (
        <button
          type="button"
          key={o.value}
          className={`quiz-chip ${value === o.value ? 'active' : ''}`}
          onClick={() => set(value === o.value ? '' : o.value)}
        >
          {o.chip || o.label}
        </button>
      ))}
    </div>
  );

  // Filtre multi (plusieurs actifs en même temps).
  const multiChips = (values, set, opts) => (
    <div className="quiz-chips">
      <button type="button" className={`quiz-chip ${!values.length ? 'active' : ''}`} onClick={() => set([])}>Tout</button>
      {opts.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            type="button"
            key={o.value}
            className={`quiz-chip ${on ? 'active' : ''}`}
            onClick={() => set(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
          >
            {o.chip || o.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <Layout className="gate-page">
      <div className="gate-header">
        <button className="btn-back" onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}>← Retour</button>
        <h1 className="gate-title">Passeport — Questions</h1>
        <p className="gate-subtitle">Banque du quiz : création, équilibre, correction</p>
      </div>

      <div className="gate-cross-links">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/gate/packs')}>← Espace Packs</button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/gate/cosmetics')}>Cosmétiques →</button>
      </div>

      <div className="quiz-stats">
        Test blanc {stat(trialCount, TARGETS.trial)} · Examen — Facile {stat(examByDiff.facile, TARGETS.examFacile)} · Moyen {stat(examByDiff.moyen, TARGETS.examMoyen)} · Difficile {stat(examByDiff.difficile, TARGETS.examDifficile)}
      </div>

      <button className="btn btn-primary gate-new-cta" onClick={startNew}>
        <Icon name="medal-gold" size={18} style={{ marginRight: 8 }} />
        Nouvelle question
      </button>

      <div className="quiz-filters">
        <div className="quiz-filter-group">
          <span className="quiz-filter-label">Catégorie</span>
          {multiChips(fCat, setFCat, CATEGORIES)}
        </div>
        <div className="quiz-filter-group">
          <span className="quiz-filter-label">Type</span>
          {chips(fScope, setFScope, SCOPES)}
        </div>
        <div className="quiz-filter-group">
          <span className="quiz-filter-label">Difficulté</span>
          {chips(fDiff, setFDiff, DIFFICULTIES)}
        </div>
        <div className="quiz-filter-foot">
          <span className="quiz-filter-count">{filtered.length} question{filtered.length > 1 ? 's' : ''}</span>
          {anyFilter && <button className="quiz-filter-clear" onClick={clearFilters}>Tout effacer</button>}
        </div>
      </div>

      {loading ? (
        <LoadingPlaceholder variant="list" count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="medal-gold" title="Aucune question" description="Crée la première question, ou ajuste les filtres." />
      ) : (
        <div className="gate-packs-list">
          {filtered.map((q, i) => {
            const inactive = q.isActive === false;
            return (
              <motion.div
                key={q._id}
                className={`gate-pack-card ${inactive ? 'draft' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <div className="gate-pack-info">
                  <div className="gate-pack-top">
                    <span className="gate-pack-name">{q.text}</span>
                    <div className="gate-pack-tags">
                      {inactive && <span className="gate-pack-status draft">Retirée</span>}
                      <span className={`quiz-badge ${q.scope}`}>{q.scope === 'exam' ? 'Examen' : 'Test blanc'}</span>
                      <span className={`quiz-badge ${q.difficulty}`}>{q.difficulty}</span>
                    </div>
                  </div>
                  <p className="quiz-correct">✓ {q.options[q.correctIndex]}</p>
                  <div className="gate-pack-meta">
                    <span>{catLabel(q.category)}</span>
                  </div>
                </div>
                <div className="gate-pack-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(q)}>Modifier</button>
                  <button className="gate-delete-btn" onClick={() => setDeleteItem(q)}>Retirer</button>
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
              <h3 className="confirm-title">Retirer cette question ?</h3>
              <p className="confirm-pack-name">"{deleteItem.text}"</p>
              <p className="confirm-desc">Elle ne sera plus tirée dans les examens ni les tests. Tu pourras la réactiver en l'éditant.</p>
              <div className="confirm-actions">
                <button className="btn btn-danger" style={{ width: '100%' }} onClick={confirmDelete} disabled={deleting}>
                  {deleting ? 'Retrait...' : 'Oui, retirer'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteItem(null)} disabled={deleting}>Annuler</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
