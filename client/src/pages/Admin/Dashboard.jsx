import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import SEO from '../../components/SEO/SEO';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import useAuthStore from '../../store/authStore';
import AdminGallery from './AdminGallery';
import AdminUsers from './AdminUsers';
import AdminReports from './AdminReports';
import AdminTournee from './AdminTournee';
import api from '../../services/api';
import './Dashboard.css';

const POLL_INTERVAL_MS = 5000;

function formatNumber(n) {
  if (n === undefined || n === null) return '—';
  return new Intl.NumberFormat('fr-FR').format(n);
}

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return `${m} min`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetchAt, setLastFetchAt] = useState(null);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState('stats'); // stats | users | reports | gallery
  const pollTimer = useRef(null);

  const fetchStats = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data: payload } = await api.get('/admin/stats');
      setData(payload);
      setLastFetchAt(new Date().toISOString());
      setError('');
    } catch (err) {
      const code = err.response?.status;
      if (code === 403) setError('Accès réservé au patron de l\'instance.');
      else if (code === 401) {
        navigate('/login', { state: { redirectTo: '/admin' } });
        return;
      }
      else setError(err.response?.data?.message || 'Erreur de chargement.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { redirectTo: '/admin' } });
      return undefined;
    }
    fetchStats();
  }, [user, navigate]);

  useEffect(() => {
    // Poll auto désactivé hors de l'onglet Stats : la galerie est statique,
    // pas besoin de la refetch toutes les 5s.
    if (paused || error || tab !== 'stats') return undefined;
    pollTimer.current = setInterval(() => fetchStats(true), POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [paused, error, tab]);

  if (!user) return null;

  return (
    <Layout className="admin-page">
      <SEO title="Dashboard" description="Tableau de bord admin." path="/admin" noindex />

      <div className="admin-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <div className="admin-header-title">
          <h1 className="admin-title">Le café du commerce</h1>
          <p className="admin-subtitle">Ce qui bouge en direct sur ton instance.</p>
        </div>
        <div className="admin-header-actions">
          {tab === 'stats' && (
            <>
              <span className={`admin-live-pill ${paused ? 'admin-live-pill--paused' : ''}`}>
                <span className="admin-live-dot" />
                {paused ? 'EN PAUSE' : 'EN DIRECT'}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? 'Reprendre' : 'Pause'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => fetchStats()}
              >
                ↻ Rafraîchir
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Onglets ──────────────────────────────────── */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'stats' ? 'is-active' : ''}`}
          onClick={() => setTab('stats')}
        >
          <Icon name="lightning" size={14} style={{ marginRight: 6 }} />
          Stats
        </button>
        <button
          className={`admin-tab ${tab === 'users' ? 'is-active' : ''}`}
          onClick={() => setTab('users')}
        >
          <Icon name="wave" size={14} style={{ marginRight: 6 }} />
          Joueurs
        </button>
        <button
          className={`admin-tab ${tab === 'reports' ? 'is-active' : ''}`}
          onClick={() => setTab('reports')}
        >
          <Icon name="cross" size={14} style={{ marginRight: 6 }} />
          Signalements
        </button>
        <button
          className={`admin-tab ${tab === 'gallery' ? 'is-active' : ''}`}
          onClick={() => setTab('gallery')}
        >
          <Icon name="camera" size={14} style={{ marginRight: 6 }} />
          Galerie
        </button>
        <button
          className={`admin-tab ${tab === 'tournee' ? 'is-active' : ''}`}
          onClick={() => setTab('tournee')}
        >
          <Icon name="anchor" size={14} style={{ marginRight: 6 }} />
          Tournée
        </button>
      </div>

      {error && tab === 'stats' && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {tab === 'gallery' ? (
        <AdminGallery />
      ) : tab === 'users' ? (
        <AdminUsers />
      ) : tab === 'tournee' ? (
        <AdminTournee />
      ) : tab === 'reports' ? (
        <AdminReports />
      ) : loading && !data ? (
        <div className="admin-grid">
          <LoadingPlaceholder variant="card" />
          <LoadingPlaceholder variant="card" />
          <LoadingPlaceholder variant="card" />
          <LoadingPlaceholder variant="card" />
        </div>
      ) : data ? (
        <>
          <p className="admin-last-fetch">
            Dernière mise à jour : il y a <strong>{timeAgo(lastFetchAt)}</strong>
            <span className="admin-last-fetch-sep">·</span>
            Refresh auto toutes les {POLL_INTERVAL_MS / 1000}s
          </p>

          {/* ─── Bandeau LIVE ─── */}
          <section className="admin-section">
            <h2 className="admin-section-title">
              <Icon name="lightning" size={16} /> En direct sur l'instance
            </h2>
            <div className="admin-grid admin-grid--live">
              <StatCard
                label="Sockets connectés"
                value={formatNumber(data.live.socketsConnected)}
                hint="Joueurs avec un onglet ouvert sur un salon"
                accent="green"
              />
              <StatCard
                label="Salons avec du monde"
                value={formatNumber(data.live.salonsWithPlayers)}
                hint={`Sur ${formatNumber(data.salons.total)} salons en base`}
                accent="green"
              />
              <StatCard
                label="Parties en cours"
                value={formatNumber(data.salons.playing)}
                hint="Statut playing"
              />
              <StatCard
                label="Pause pastis"
                value={formatNumber(data.salons.betweenGames)}
                hint="Salons entre 2 parties"
              />
            </div>

            {data.salons.activeRooms.length > 0 && (
              <div className="admin-rooms">
                <h3 className="admin-rooms-title">Salons actifs · qui est au comptoir</h3>
                <ul className="admin-rooms-list">
                  {data.salons.activeRooms.map((r) => (
                    <li key={r.code} className="admin-rooms-card">
                      <div className="admin-rooms-head">
                        <div className="admin-rooms-meta">
                          <button
                            type="button"
                            className="admin-rooms-code"
                            onClick={() => navigator.clipboard.writeText(r.code).catch(() => {})}
                            title="Cliquer pour copier"
                          >
                            {r.code}
                          </button>
                          {r.name && <span className="admin-rooms-name">{r.name}</span>}
                          {r.phase && <span className="admin-rooms-phase">{r.phase}</span>}
                        </div>
                        <span className="admin-rooms-count">
                          <Icon name="football" size={12} /> {r.onlineCount} en ligne
                        </span>
                      </div>
                      {Array.isArray(r.players) && r.players.length > 0 && (
                        <ul className="admin-rooms-players">
                          {r.players.map((p) => (
                            <li key={p.playerId} className="admin-rooms-player">
                              <span className={`admin-player-dot ${p.isHost ? 'is-host' : ''}`} />
                              <span className="admin-player-pseudo">{p.pseudo}</span>
                              {p.isHost && <span className="admin-player-badge admin-player-badge--host">Host</span>}
                              {p.username && p.username !== p.pseudo && (
                                <span className="admin-player-username">@{p.username}</span>
                              )}
                              {p.role === 'gate' && (
                                <span className="admin-player-badge admin-player-badge--gate">Gaté</span>
                              )}
                              {p.tier === 'premium' && p.role !== 'gate' && (
                                <span className="admin-player-badge admin-player-badge--premium">Premium</span>
                              )}
                              {!p.userId && (
                                <span className="admin-player-badge admin-player-badge--anon">Anonyme</span>
                              )}
                              {p.email && (
                                <span className="admin-player-email" title={p.email}>{p.email}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ─── Users ─── */}
          <section className="admin-section">
            <h2 className="admin-section-title">
              <Icon name="wave" size={16} /> Les gatés du site
            </h2>
            <div className="admin-grid">
              <StatCard label="Total comptes" value={formatNumber(data.users.total)} accent="gold" />
              <StatCard label="Free" value={formatNumber(data.users.free)} />
              <StatCard label="Premium" value={formatNumber(data.users.premium)} accent="gold" />
              <StatCard label="Gatés (admin)" value={formatNumber(data.users.gate)} />
              <StatCard
                label="Inscrits 7 derniers jours"
                value={formatNumber(data.users.signupsLast7d)}
                hint={`vs ${formatNumber(data.users.signupsLast30d)} sur 30j`}
              />
            </div>
          </section>

          {/* ─── Subscriptions ─── */}
          <section className="admin-section">
            <h2 className="admin-section-title">
              <Icon name="star" size={16} /> Abonnements Stripe
            </h2>
            <div className="admin-grid">
              <StatCard
                label="MRR estimé"
                value={`${formatNumber(data.subscriptions.estimatedMRR)} €`}
                hint="Sur la base de 4,99 €/mois en moyenne"
                accent="gold"
              />
              <StatCard
                label="Abos actifs"
                value={formatNumber(data.subscriptions.active)}
                accent="green"
              />
              <StatCard
                label="Annulés (en cours)"
                value={formatNumber(data.subscriptions.cancelAtPeriodEnd)}
                hint="cancel_at_period_end = true"
                accent="red"
              />
              <StatCard
                label="Past due"
                value={formatNumber(data.subscriptions.pastDue)}
                accent="red"
              />
              <StatCard
                label="Annulés (finis)"
                value={formatNumber(data.subscriptions.canceled)}
              />
            </div>
          </section>

          {/* ─── Salons & Parties ─── */}
          <section className="admin-section">
            <h2 className="admin-section-title">
              <Icon name="anchor" size={16} /> Salons et parties
            </h2>
            <div className="admin-grid">
              <StatCard label="Salons total" value={formatNumber(data.salons.total)} />
              <StatCard label="À l'apéro" value={formatNumber(data.salons.lobby)} hint="Statut lobby" />
              <StatCard label="Sur le carreau" value={formatNumber(data.salons.playing)} hint="Statut playing" />
              <StatCard label="Au cagnard" value={formatNumber(data.salons.ended)} hint="Salons fermés" />
              <StatCard
                label="Parties salon jouées"
                value={formatNumber(data.salons.totalGamesPlayed)}
                hint="Cumulé sur tous les salons"
              />
              <StatCard
                label="Parties locales sauvegardées"
                value={formatNumber(data.sessions.totalLocalSaved)}
                hint={`+ ${formatNumber(data.sessions.totalMedia)} médias`}
              />
            </div>
          </section>

          {/* ─── Packs ─── */}
          <section className="admin-section">
            <h2 className="admin-section-title">
              <Icon name="trophy" size={16} /> Packs en catalogue
            </h2>
            <div className="admin-grid">
              <StatCard label="Officiels" value={formatNumber(data.packs.official)} accent="gold" />
              <StatCard label="Persos (users)" value={formatNumber(data.packs.custom)} />
              <StatCard label="Total" value={formatNumber(data.packs.total)} />
            </div>
          </section>
        </>
      ) : null}
    </Layout>
  );
}

function StatCard({ label, value, hint, accent }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={String(value)}
        className={`admin-stat ${accent ? `admin-stat--${accent}` : ''}`}
        initial={{ scale: 0.96, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      >
        <span className="admin-stat-value">{value}</span>
        <span className="admin-stat-label">{label}</span>
        {hint && <span className="admin-stat-hint">{hint}</span>}
      </motion.div>
    </AnimatePresence>
  );
}
