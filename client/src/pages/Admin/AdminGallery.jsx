import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/Icon/Icon';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import api from '../../services/api';
import './AdminGallery.css';

// Thumbnail Cloudinary : insère les transforms dans l'URL pour éviter de
// charger l'asset complet en grid. f_auto + q_auto = format & quality auto.
function thumbUrl(url, resourceType) {
  if (!url || !url.includes('/upload/')) return url;
  const tx = resourceType === 'video'
    ? 'w_400,h_400,c_fill,q_auto,f_auto,so_0'  // poster à 0s pour vidéos
    : 'w_400,h_400,c_fill,q_auto,f_auto';
  return url.replace('/upload/', `/upload/${tx}/`);
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
}

function truncate(s, n = 50) {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function SourceBadge({ source }) {
  if (source === 'local') return <span className="ag-source ag-source--local">Local</span>;
  if (source === 'salon-live') return <span className="ag-source ag-source--live">Live</span>;
  return <span className="ag-source ag-source--salon">Salon</span>;
}

export default function AdminGallery() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPseudo, setSelectedPseudo] = useState(null);
  const [filter, setFilter] = useState('all'); // all | image | video
  const [search, setSearch] = useState('');
  const [lightbox, setLightbox] = useState(null); // { url, resourceType }

  useEscapeClose(Boolean(lightbox), () => setLightbox(null));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: payload } = await api.get('/admin/gallery');
        if (cancelled) return;
        setData(payload);
        if (payload.pseudos?.length) setSelectedPseudo(payload.pseudos[0].pseudo);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || 'Erreur de chargement.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredPseudos = useMemo(() => {
    if (!data?.pseudos) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.pseudos;
    return data.pseudos.filter((p) => p.pseudo.toLowerCase().includes(q));
  }, [data, search]);

  const currentGroup = useMemo(() => {
    return data?.pseudos?.find((p) => p.pseudo === selectedPseudo) || null;
  }, [data, selectedPseudo]);

  const visibleItems = useMemo(() => {
    if (!currentGroup) return [];
    if (filter === 'all') return currentGroup.items;
    return currentGroup.items.filter((i) => i.resourceType === filter);
  }, [currentGroup, filter]);

  if (loading) {
    return (
      <div className="ag-loading">
        <LoadingPlaceholder variant="card" count={3} label="Chargement de la galerie" />
      </div>
    );
  }

  if (error) {
    return <div className="admin-error">{error}</div>;
  }

  if (!data || data.totals.total === 0) {
    return (
      <EmptyState
        icon="camera"
        title="Pas une photo, hé bé !"
        description="La galerie est vide pour l'instant. Les souvenirs des salons et parties locales s'accumuleront ici."
      />
    );
  }

  return (
    <>
      <div className="ag-totals">
        <span><strong>{data.totals.pseudoCount}</strong> pseudo{data.totals.pseudoCount > 1 ? 's' : ''}</span>
        <span><strong>{data.totals.photoCount}</strong> photo{data.totals.photoCount > 1 ? 's' : ''}</span>
        <span><strong>{data.totals.videoCount}</strong> vidéo{data.totals.videoCount > 1 ? 's' : ''}</span>
      </div>

      <div className="ag-layout">
        {/* ─── Liste des pseudos ───────────────────────── */}
        <aside className="ag-sidebar">
          <input
            type="search"
            className="input ag-search"
            placeholder="Filtrer un pseudo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="ag-pseudo-list">
            {filteredPseudos.map((p) => (
              <li key={p.pseudo}>
                <button
                  type="button"
                  className={`ag-pseudo-row ${p.pseudo === selectedPseudo ? 'is-active' : ''}`}
                  onClick={() => setSelectedPseudo(p.pseudo)}
                >
                  <span className="ag-pseudo-name">{p.pseudo}</span>
                  <span className="ag-pseudo-counts">
                    {p.photoCount > 0 && <span>📷 {p.photoCount}</span>}
                    {p.videoCount > 0 && <span>🎥 {p.videoCount}</span>}
                  </span>
                </button>
              </li>
            ))}
            {filteredPseudos.length === 0 && (
              <li className="ag-pseudo-empty">Aucun pseudo ne match.</li>
            )}
          </ul>
        </aside>

        {/* ─── Grid des médias ─────────────────────────── */}
        <main className="ag-main">
          {currentGroup ? (
            <>
              <header className="ag-main-header">
                <h2 className="ag-main-title">
                  {currentGroup.pseudo}
                  <span className="ag-main-count">
                    {visibleItems.length} / {currentGroup.count}
                  </span>
                </h2>
                <div className="ag-filter">
                  <button
                    className={`ag-filter-btn ${filter === 'all' ? 'is-active' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    Tout
                  </button>
                  <button
                    className={`ag-filter-btn ${filter === 'image' ? 'is-active' : ''}`}
                    onClick={() => setFilter('image')}
                  >
                    Photos
                  </button>
                  <button
                    className={`ag-filter-btn ${filter === 'video' ? 'is-active' : ''}`}
                    onClick={() => setFilter('video')}
                  >
                    Vidéos
                  </button>
                </div>
              </header>

              {visibleItems.length === 0 ? (
                <EmptyState
                  icon="camera"
                  title="Rien dans ce filtre"
                  description={filter === 'video' ? "Pas une vidéo de ce pseudo." : "Pas une photo de ce pseudo."}
                />
              ) : (
                <div className="ag-grid">
                  {visibleItems.map((item, i) => (
                    <motion.button
                      key={`${item.url}-${i}`}
                      type="button"
                      className="ag-thumb"
                      onClick={() => setLightbox(item)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    >
                      <div className="ag-thumb-media">
                        {item.resourceType === 'video' ? (
                          <>
                            <img src={thumbUrl(item.url, 'video')} alt="" loading="lazy" />
                            <span className="ag-thumb-play">▶</span>
                          </>
                        ) : (
                          <img src={thumbUrl(item.url, 'image')} alt="" loading="lazy" />
                        )}
                      </div>
                      <div className="ag-thumb-caption">
                        <SourceBadge source={item.source} />
                        <span className="ag-thumb-context">
                          {item.salonName || 'Partie locale'} · {formatDate(item.gameDate)}
                        </span>
                        {item.challengeText && (
                          <span className="ag-thumb-challenge" title={item.challengeText}>
                            « {truncate(item.challengeText, 60)} »
                          </span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon="camera"
              title="Choisis un pseudo"
              description="Sélectionne quelqu'un à gauche pour voir ses souvenirs."
            />
          )}
        </main>
      </div>

      {/* ─── Lightbox plein écran ──────────────────────── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="ag-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              className="ag-lightbox-close"
              onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
              aria-label="Fermer"
            >×</button>
            <div className="ag-lightbox-content" onClick={(e) => e.stopPropagation()}>
              {lightbox.resourceType === 'video' ? (
                <video src={lightbox.url} controls autoPlay playsInline />
              ) : (
                <img src={lightbox.url} alt="" />
              )}
              <div className="ag-lightbox-caption">
                <SourceBadge source={lightbox.source} />
                <span>
                  <strong>{lightbox.pseudo || 'Anonyme'}</strong>
                  {lightbox.salonName ? ` · ${lightbox.salonName}` : ' · Partie locale'}
                  {lightbox.salonCode ? ` (${lightbox.salonCode})` : ''}
                  {' · '}{formatDate(lightbox.gameDate)}
                </span>
                {lightbox.challengeText && (
                  <span className="ag-lightbox-challenge">« {lightbox.challengeText} »</span>
                )}
                <a
                  href={lightbox.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ag-lightbox-link"
                >
                  <Icon name="lightning" size={12} />
                  Ouvrir l'original
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
