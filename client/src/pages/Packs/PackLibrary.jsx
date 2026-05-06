import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import PaywallModal from '../../components/PaywallModal/PaywallModal';
import RoulettePreview from '../../components/RoulettePreview/RoulettePreview';
import { useCategories } from '../../hooks/useCategories';
import { invalidateCosmetics } from '../../hooks/useActiveSkin';
import useAuthStore from '../../store/authStore';
import { fumigenesVariants } from '../../styles/motion';
import api from '../../services/api';
import './PackLibrary.css';

const COSMETIC_CAT_LABELS = {
  roulette: 'Skins de roulette',
  needle: 'Aiguilles',
  cochonnet: 'Cochonnets',
  'avatar-frame': 'Cadres avatar',
  badge: 'Badges',
  background: 'Fonds d\'app',
  'sound-pack': 'Packs sonores',
  'endgame-anim': 'Animations EndGame',
};

function formatPrice(cents) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default function PackLibrary() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { user, setUser } = useAuthStore();
  const initialTab = params.get('tab') === 'cosmetics' ? 'cosmetics' : 'packs';
  const [tab, setTab] = useState(initialTab);

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
  const { categories } = useCategories();

  // Cosmetics state
  const [cosmetics, setCosmetics] = useState([]);
  const [cosmeticsLoading, setCosmeticsLoading] = useState(false);
  const [buying, setBuying] = useState(null);
  const [purchasedFlash, setPurchasedFlash] = useState(null);
  const [cosmeticsError, setCosmeticsError] = useState('');
  const purchasedParam = params.get('purchased');

  const switchTab = (newTab) => {
    setTab(newTab);
    const next = new URLSearchParams(params);
    if (newTab === 'cosmetics') next.set('tab', 'cosmetics');
    else next.delete('tab');
    next.delete('purchased');
    setParams(next, { replace: true });
  };

  // Map slug → catégorie pour lookup rapide ; on exclut "custom" du picker.
  const catBySlug = useMemo(() => {
    const m = {};
    for (const c of categories) m[c.slug] = c;
    return m;
  }, [categories]);
  const filterableCategories = useMemo(
    () => categories.filter((c) => c.slug !== 'custom'),
    [categories]
  );

  useEffect(() => {
    const url = filter === 'tous' ? '/packs' : `/packs?theme=${filter}`;
    setLoading(true);
    api.get(url)
      .then(({ data }) => setPacks(data.packs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  // Charge les cosmétiques quand on entre dans l'onglet
  useEffect(() => {
    if (tab !== 'cosmetics' || cosmetics.length > 0) return;
    setCosmeticsLoading(true);
    api.get('/cosmetics')
      .then(({ data }) => setCosmetics(data.cosmetics || []))
      .catch(() => setCosmeticsError("Impossible de charger la boutique."))
      .finally(() => setCosmeticsLoading(false));
  }, [tab]);

  // Refresh user après retour de Stripe
  useEffect(() => {
    if (!purchasedParam) return;
    invalidateCosmetics();
    api.get('/auth/me').then(({ data }) => {
      setUser(data.user);
      if (data.user.purchasedSkins?.includes(purchasedParam)) {
        setPurchasedFlash(purchasedParam);
        setTimeout(() => setPurchasedFlash(null), 4000);
      }
    }).catch(() => {});
    api.get('/cosmetics').then(({ data }) => setCosmetics(data.cosmetics || [])).catch(() => {});
  }, [purchasedParam]);

  const handleBuyCosmetic = async (cosmetic) => {
    if (!user) { navigate('/login'); return; }
    setBuying(cosmetic.slug);
    setCosmeticsError('');
    try {
      const { data } = await api.post(`/cosmetics/${cosmetic.slug}/checkout`);
      window.location.href = data.url;
    } catch (err) {
      setCosmeticsError(err.response?.data?.message || 'Erreur de paiement.');
      setBuying(null);
    }
  };

  const groupedCosmetics = useMemo(() => {
    const map = {};
    for (const c of cosmetics) {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    }
    return map;
  }, [cosmetics]);

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
        <h1 className="library-title">{tab === 'cosmetics' ? 'La Boutique' : 'Les Packs'}</h1>
      </div>

      {/* Onglets Packs / Cosmétiques */}
      <div className="library-tabs">
        <button
          className={`library-tab ${tab === 'packs' ? 'active' : ''}`}
          onClick={() => switchTab('packs')}
        >
          <Icon name="wheel" size={16} style={{ marginRight: 6 }} />
          Packs de défis
        </button>
        <button
          className={`library-tab ${tab === 'cosmetics' ? 'active' : ''}`}
          onClick={() => switchTab('cosmetics')}
        >
          <Icon name="star" size={16} style={{ marginRight: 6 }} />
          Cosmétiques
        </button>
      </div>

      {tab === 'packs' && (
        <>
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
            <button
              className={`filter-btn ${filter === 'tous' ? 'active' : ''}`}
              onClick={() => setFilter('tous')}
            >
              <Icon name="wheel" size={16} style={{ marginRight: 4 }} />
              Tous
            </button>
            {filterableCategories.map((c) => (
              <button
                key={c.slug}
                className={`filter-btn ${filter === c.slug ? 'active' : ''}`}
                onClick={() => setFilter(c.slug)}
              >
                <Icon name={c.icon} size={16} style={{ marginRight: 4 }} />
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'cosmetics' && (
        <CosmeticsView
          cosmetics={cosmetics}
          grouped={groupedCosmetics}
          loading={cosmeticsLoading}
          buying={buying}
          error={cosmeticsError}
          purchasedFlash={purchasedFlash}
          onBuy={handleBuyCosmetic}
        />
      )}

      {/* Liste des packs */}
      {tab === 'packs' && (loading ? (
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
                  <span className="library-pack-icon"><Icon name={catBySlug[pack.theme]?.icon || 'wheel'} size={22} /></span>
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
      })())}

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

function CosmeticsView({ cosmetics, grouped, loading, buying, error, purchasedFlash, onBuy }) {
  return (
    <>
      <AnimatePresence>
        {purchasedFlash && (
          <motion.div
            className="library-purchased-flash"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Icon name="check" size={18} />
            <span>Cosmétique débloqué ! Active-le depuis ton profil.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="library-cos-error">{error}</p>}

      {loading ? (
        <p className="library-loading">Chargement...</p>
      ) : cosmetics.length === 0 ? (
        <p className="library-loading">Aucun cosmétique en vente pour l'instant.</p>
      ) : (
        Object.keys(grouped).map((cat) => (
          <section key={cat} className="library-cos-section">
            <h2 className="library-section-title">{COSMETIC_CAT_LABELS[cat] || cat}</h2>
            <div className="library-cos-grid">
              {grouped[cat].map((c, i) => (
                <motion.div
                  key={c._id}
                  className={`library-cos-card ${c.owned ? 'owned' : ''}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {c.category === 'roulette' && c.asset?.metals && (
                    <div className="library-cos-preview">
                      <RoulettePreview palette={c.asset.metals} size={130} />
                    </div>
                  )}
                  <div className="library-cos-info">
                    <span className="library-cos-name">{c.name}</span>
                    {c.description && <p className="library-cos-desc">{c.description}</p>}
                    <span className="library-cos-price">{formatPrice(c.priceCents)}</span>
                  </div>
                  {c.owned ? (
                    <span className="library-cos-owned">
                      <Icon name="check" size={14} /> Possédé
                    </span>
                  ) : (
                    <button
                      className="btn btn-gold btn-sm library-cos-buy"
                      onClick={() => onBuy(c)}
                      disabled={buying === c.slug}
                    >
                      {buying === c.slug ? '...' : `Acheter ${formatPrice(c.priceCents)}`}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
