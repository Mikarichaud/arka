import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import PaywallModal from '../../components/PaywallModal/PaywallModal';
import { fumigenesVariants } from '../../styles/motion';
import api from '../../services/api';
import './PackLibrary.css';

const THEME_ICONS = { marseillais: 'anchor', amis: 'party', sportif: 'football', couple: 'heart', enfants: 'balloon', custom: 'pencil' };
const THEME_LABELS = { marseillais: 'Marseillais', amis: 'Amis', sportif: 'Sport', couple: 'Couple', enfants: 'Enfants', custom: 'Perso' };
const THEMES = ['tous', 'marseillais', 'amis', 'sportif', 'couple', 'enfants'];

export default function PackLibrary() {
  const navigate = useNavigate();
  const location = useLocation();
  const [packs, setPacks] = useState([]);
  const [filter, setFilter] = useState('tous');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [expandedData, setExpandedData] = useState({});
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [paywallPack, setPaywallPack] = useState(null);
  const [sharePack, setSharePack] = useState(null);
  const [copied, setCopied] = useState(false);
  const [deletePack, setDeletePack] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const url = filter === 'tous' ? '/packs' : `/packs?theme=${filter}`;
    setLoading(true);
    api.get(url)
      .then(({ data }) => setPacks(data.packs))
      .catch(() => {})
      .finally(() => setLoading(false));
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

  const confirmDelete = async () => {
    if (!deletePack) return;
    setDeleting(true);
    try {
      await api.delete(`/packs/${deletePack._id}`);
      setPacks((prev) => prev.filter((p) => p._id !== deletePack._id));
      setExpandedData((prev) => {
        const next = { ...prev };
        delete next[deletePack._id];
        return next;
      });
      setDeletePack(null);
    } catch {
      // Affiche l'erreur dans la modale, on la garde ouverte
    } finally {
      setDeleting(false);
    }
  };

  const handleExpand = async (pack) => {
    if (expanded === pack._id) {
      setExpanded(null);
      return;
    }
    // Le serveur renvoie soit le pack complet, soit le teaser si pas d'accès.
    // La liste `/packs` utilise `.select('-challenges')`, donc on doit fetcher
    // le détail pour tous les packs (pas seulement les premium).
    if (!expandedData[pack._id]) {
      try {
        const { data } = await api.get(`/packs/${pack._id}`);
        setExpandedData((prev) => ({ ...prev, [pack._id]: data }));
      } catch {
        setExpandedData((prev) => ({ ...prev, [pack._id]: { pack, locked: !pack.accessible } }));
      }
    }
    setExpanded(pack._id);
  };

  const getPackDetail = (pack) => {
    return expandedData[pack._id] || { pack, locked: !pack.accessible };
  };

  return (
    <Layout className="library-page">
      <div className="library-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="library-title">Les Packs</h1>
      </div>

      {/* CTA créer un pack — accès rapide en haut */}
      <button
        className="btn btn-gold library-create-cta"
        onClick={() => navigate('/editor')}
      >
        <Icon name="pencil" size={18} style={{ marginRight: 8 }} />
        Créer mon pack perso
      </button>

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
      ) : (() => {
        const myPacks = packs.filter((p) => p.isMine);
        const officialPacks = packs.filter((p) => !p.isMine);
        const renderPack = (pack, i) => {
            const detail = getPackDetail(pack);
            const isExpanded = expanded === pack._id;
            // accessible vient du serveur (tient compte du tier + purchasedPacks)
            const isLocked = isExpanded ? detail.locked : !pack.accessible;

            return (
              <motion.div
                key={pack._id}
                className={`library-pack-card ${pack.isPremium ? 'library-pack-card--premium' : ''} ${pack.isMine ? 'library-pack-card--mine' : ''}`}
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
                      {pack.isMine && <span className="library-mine-tag">Mon pack</span>}
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
                      <div className="library-pack-actions">
                        <button
                          className="btn btn-gold btn-sm"
                          style={{ width: '100%' }}
                          onClick={() => navigate('/session/setup', { state: { preselectedPackId: pack._id } })}
                        >
                          Jouer avec ce pack
                        </button>
                        {pack.isMine && (
                          <>
                            {detail.pack?.shareCode && (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ width: '100%' }}
                                onClick={() => { setCopied(false); setSharePack(detail.pack); }}
                              >
                                <Icon name="wheel" size={14} style={{ marginRight: 6 }} />
                                Partager (QR + lien)
                              </button>
                            )}
                            <div className="library-pack-actions-row">
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ flex: 1 }}
                                onClick={() => navigate(`/editor/${pack._id}`)}
                              >
                                Modifier
                              </button>
                              <button
                                className="library-delete-btn"
                                onClick={() => setDeletePack(pack)}
                              >
                                Supprimer
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
        };

        return (
          <div className="library-grid">
            {myPacks.length > 0 && (
              <>
                <h2 className="library-section-title">Mes packs</h2>
                {myPacks.map((p, i) => renderPack(p, i))}
              </>
            )}
            {officialPacks.length > 0 && (
              <>
                {myPacks.length > 0 && <h2 className="library-section-title">Packs officiels</h2>}
                {officialPacks.map((p, i) => renderPack(p, i))}
              </>
            )}
          </div>
        );
      })()}

      <PaywallModal pack={paywallPack} onClose={() => setPaywallPack(null)} />

      <AnimatePresence>
        {deletePack && (
          <motion.div
            className="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !deleting && setDeletePack(null)}
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
              <h3 className="confirm-title">Supprimer le pack ?</h3>
              <p className="confirm-pack-name">"{deletePack.name}"</p>
              <p className="confirm-desc">
                Tous les défis et le code de partage seront perdus. C'est définitif, oh fada !
              </p>
              <div className="confirm-actions">
                <button
                  className="btn btn-danger"
                  style={{ width: '100%' }}
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Suppression...' : 'Oui, supprimer'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setDeletePack(null)}
                  disabled={deleting}
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sharePack && (
          <motion.div
            className="share-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSharePack(null)}
          >
            <motion.div
              className="share-modal"
              variants={fumigenesVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="share-title">Partager le pack</h3>
              <p className="share-pack-name">"{sharePack.name}"</p>
              <div className="share-qr">
                <QRCodeSVG
                  value={`${window.location.origin}/packs/import/${sharePack.shareCode}`}
                  size={200}
                  fgColor="#0057A8"
                  bgColor="white"
                  level="H"
                />
              </div>
              <div className="share-code-row">
                <span className="share-code">Code : {sharePack.shareCode}</span>
              </div>
              <div className="share-actions">
                <button
                  className="btn btn-gold btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/packs/import/${sharePack.shareCode}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? '✓ Copié !' : 'Copier le lien'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSharePack(null)}>
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
