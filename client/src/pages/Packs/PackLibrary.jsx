import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import api from '../../services/api';
import './PackLibrary.css';

const THEME_ICONS = { marseillais: '⚓', amis: '🎉', sportif: '⚽', couple: '❤️', enfants: '🎈', custom: '✏️' };
const THEME_LABELS = { marseillais: 'Marseillais', amis: 'Amis', sportif: 'Sport', couple: 'Couple', enfants: 'Enfants', custom: 'Perso' };
const THEMES = ['tous', 'marseillais', 'amis', 'sportif', 'couple', 'enfants'];

export default function PackLibrary() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [filter, setFilter] = useState('tous');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const url = filter === 'tous' ? '/packs' : `/packs?theme=${filter}`;
    api.get(url).then(({ data }) => { setPacks(data.packs); setLoading(false); });
  }, [filter]);

  const handleImport = async () => {
    if (!importCode.trim()) return;
    setImporting(true);
    setImportError('');
    try {
      const { data } = await api.get(`/packs/share/${importCode.trim().toUpperCase()}`);
      navigate('/session/setup', { state: { preselectedPackId: data.pack._id } });
    } catch {
      setImportError('Code introuvable, té !');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Layout className="library-page">
      <div className="library-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Retour</button>
        <h1 className="library-title">Les Packs</h1>
      </div>

      {/* Import par code */}
      <div className="library-import card">
        <p className="library-import-label">Tu as un code de partage ?</p>
        <div className="library-import-row">
          <input
            className="input"
            placeholder="Code (ex: AB12CD34)"
            value={importCode}
            onChange={(e) => setImportCode(e.target.value.toUpperCase())}
            maxLength={8}
            style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleImport} disabled={importing}>
            {importing ? '...' : 'Go'}
          </button>
        </div>
        {importError && <p className="library-import-error">{importError}</p>}
      </div>

      {/* Filtres par thème */}
      <div className="library-filters">
        {THEMES.map((t) => (
          <button
            key={t}
            className={`filter-btn ${filter === t ? 'active' : ''}`}
            onClick={() => setFilter(t)}
          >
            {t === 'tous' ? '🎡 Tous' : `${THEME_ICONS[t]} ${THEME_LABELS[t]}`}
          </button>
        ))}
      </div>

      {/* Liste des packs */}
      {loading ? (
        <p className="library-loading">Chargement...</p>
      ) : (
        <div className="library-grid">
          {packs.map((pack, i) => (
            <motion.div
              key={pack._id}
              className="library-pack-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="library-pack-top" onClick={() => setExpanded(expanded === pack._id ? null : pack._id)}>
                <span className="library-pack-icon">{THEME_ICONS[pack.theme] || '🎡'}</span>
                <div className="library-pack-info">
                  <span className="library-pack-name">{pack.name}</span>
                  <span className="library-pack-desc">{pack.description}</span>
                </div>
                <span className="library-pack-chevron">{expanded === pack._id ? '▲' : '▼'}</span>
              </div>

              {expanded === pack._id && (
                <motion.div
                  className="library-pack-challenges"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                >
                  {pack.challenges?.map((c, j) => (
                    <div key={j} className="library-challenge-item">
                      <span
                        className="library-challenge-dot"
                        style={{ background: c.intensity?.color || '#2DC653' }}
                      />
                      <span>{c.text}</span>
                    </div>
                  ))}
                  <button
                    className="btn btn-gold btn-sm"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={() => navigate('/session/setup', { state: { preselectedPackId: pack._id } })}
                  >
                    Jouer avec ce pack
                  </button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* CTA créer un pack */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 'auto' }}
        onClick={() => navigate('/editor')}
      >
        + Créer mon propre pack
      </button>
    </Layout>
  );
}
