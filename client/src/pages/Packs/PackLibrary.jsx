import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import PaywallModal from '../../components/PaywallModal/PaywallModal';
import api from '../../services/api';
import './PackLibrary.css';

const THEME_ICONS = { marseillais: 'anchor', amis: 'party', sportif: 'football', couple: 'heart', enfants: 'balloon', custom: 'pencil' };
const THEME_LABELS = { marseillais: 'Marseillais', amis: 'Amis', sportif: 'Sport', couple: 'Couple', enfants: 'Enfants', custom: 'Perso' };
const THEMES = ['tous', 'marseillais', 'amis', 'sportif', 'couple', 'enfants'];

export default function PackLibrary() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [filter, setFilter] = useState('tous');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [expandedData, setExpandedData] = useState({});
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [paywallPack, setPaywallPack] = useState(null);

  useEffect(() => {
    const url = filter === 'tous' ? '/packs' : `/packs?theme=${filter}`;
    setLoading(true);
    api.get(url).then(({ data }) => { setPacks(data.packs); setLoading(false); });
  }, [filter]);

  const handleImport = async () => {
    if (!importCode.trim()) return;
    setImporting(true);
    setImportError('');
    try {
      const { data } = await api.get(`/packs/share/${importCode.trim().toUpperCase()}`);
      if (data.locked) {
        setPaywallPack(data.pack);
      } else {
        navigate('/session/setup', { state: { preselectedPackId: data.pack._id } });
      }
    } catch {
      setImportError('Code introuvable, té !');
    } finally {
      setImporting(false);
    }
  };

  const handleExpand = async (pack) => {
    if (expanded === pack._id) {
      setExpanded(null);
      return;
    }
    if (pack.isPremium) {
      // Charger le teaser depuis le serveur
      if (!expandedData[pack._id]) {
        try {
          const { data } = await api.get(`/packs/${pack._id}`);
          setExpandedData((prev) => ({ ...prev, [pack._id]: data }));
        } catch {
          setExpandedData((prev) => ({ ...prev, [pack._id]: { pack, locked: true } }));
        }
      }
    }
    setExpanded(pack._id);
  };

  const getPackDetail = (pack) => {
    if (!pack.isPremium) return { pack, locked: false };
    return expandedData[pack._id] || { pack, locked: true };
  };

  return (
    <Layout className="library-page">
      <div className="library-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Retour</button>
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
            {t === 'tous' ? <><Icon name="wheel" size={16} style={{ marginRight: 4 }} />Tous</> : <><Icon name={THEME_ICONS[t]} size={16} style={{ marginRight: 4 }} />{THEME_LABELS[t]}</>}
          </button>
        ))}
      </div>

      {/* Liste des packs */}
      {loading ? (
        <p className="library-loading">Chargement...</p>
      ) : (
        <div className="library-grid">
          {packs.map((pack, i) => {
            const detail = getPackDetail(pack);
            const isExpanded = expanded === pack._id;
            // accessible vient du serveur (tient compte du tier + purchasedPacks)
            const isLocked = isExpanded ? detail.locked : !pack.accessible;

            return (
              <motion.div
                key={pack._id}
                className={`library-pack-card ${pack.isPremium ? 'library-pack-card--premium' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="library-pack-top" onClick={() => handleExpand(pack)}>
                  <span className="library-pack-icon"><Icon name={THEME_ICONS[pack.theme] || 'wheel'} size={22} /></span>
                  <div className="library-pack-info">
                    <span className="library-pack-name">
                      {pack.name}
                      {pack.isPremium && <span className="library-premium-tag">Premium</span>}
                    </span>
                    <span className="library-pack-desc">{pack.description}</span>
                  </div>
                  {isLocked && !isExpanded
                    ? <Icon name="lock" size={18} />
                    : <span className="library-pack-chevron">{isExpanded ? '▲' : '▼'}</span>
                  }
                </div>

                {isExpanded && (
                  <motion.div
                    className="library-pack-challenges"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                  >
                    {detail.pack?.challenges?.map((c, j) => (
                      <div key={j} className={`library-challenge-item ${isLocked && j > 0 ? 'library-challenge-item--blurred' : ''}`}>
                        <span
                          className="library-challenge-dot"
                          style={{ background: c.intensity?.color || '#2DC653' }}
                        />
                        <span>{isLocked && j > 0 ? '████████████████' : c.text}</span>
                      </div>
                    ))}

                    {isLocked ? (
                      <div className="library-locked-cta">
                        <p className="library-locked-msg">
                          + {(detail.pack?.totalChallenges || 8) - 1} défis accessibles en Premium
                        </p>
                        <button
                          className="btn btn-gold btn-sm"
                          style={{ width: '100%' }}
                          onClick={() => setPaywallPack(detail.pack)}
                        >
                          Débloquer ce pack
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-gold btn-sm"
                        style={{ width: '100%', marginTop: 12 }}
                        onClick={() => navigate('/session/setup', { state: { preselectedPackId: pack._id } })}
                      >
                        Jouer avec ce pack
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
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

      <PaywallModal pack={paywallPack} onClose={() => setPaywallPack(null)} />
    </Layout>
  );
}
