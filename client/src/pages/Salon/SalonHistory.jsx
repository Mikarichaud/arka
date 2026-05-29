import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { loadSalonCreds } from '../../services/salonStorage';
import api from '../../services/api';
import './Salon.css';
import './SalonHistory.css';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function SalonHistory() {
  const { code: rawCode } = useParams();
  const code = rawCode?.toUpperCase();
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('parties');     // 'parties' | 'stats' | 'galerie'
  const [openGame, setOpenGame] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  useEscapeClose(Boolean(openGame), () => setOpenGame(null));
  useEscapeClose(Boolean(lightbox), () => setLightbox(null));
  useEscapeClose(Boolean(reportTarget), () => { if (!reportBusy) setReportTarget(null); });

  useEffect(() => {
    if (!reportMsg) return undefined;
    const t = setTimeout(() => setReportMsg(''), 3500);
    return () => clearTimeout(t);
  }, [reportMsg]);

  const submitReport = async () => {
    if (!reportTarget) return;
    setReportBusy(true);
    try {
      const creds = loadSalonCreds(code);
      await api.post(
        `/salons/${code}/report`,
        { mediaUrl: reportTarget.url, targetPseudo: reportTarget.playerName, reason: reportReason },
        creds?.connectionToken ? { headers: { 'x-salon-token': creds.connectionToken } } : undefined,
      );
      setReportMsg('Merci, c\'est signalé au patron. Il va regarder ça.');
      setReportTarget(null);
      setReportReason('');
    } catch (err) {
      setReportMsg(err.response?.data?.message || 'Signalement impossible, réessaie.');
    } finally {
      setReportBusy(false);
    }
  };

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    const creds = loadSalonCreds(code);
    const params = creds?.connectionToken ? { token: creds.connectionToken } : {};
    api.get(`/salons/${code}/history`, { params })
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || 'Historique inaccessible.'))
      .finally(() => setLoading(false));
  }, [code]);

  const totals = useMemo(() => {
    if (!data) return null;
    const games = data.games || [];
    const totalChallenges = games.reduce((acc, g) => acc + (g.challengeCount || 0), 0);
    const totalMedia = (data.gallery || []).length;
    return { totalChallenges, totalMedia };
  }, [data]);

  if (loading) {
    return (
      <Layout className="salon-history-page">
        <div className="salon-header">
          <h1 className="salon-title">L'historique…</h1>
        </div>
        <LoadingPlaceholder variant="tall" />
        <LoadingPlaceholder variant="card" />
        <LoadingPlaceholder variant="card" />
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout className="salon-history-page">
        <div className="salon-header">
          <button
            className="btn-back"
            onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/salons'))}
          >← Retour</button>
          <h1 className="salon-title">L'historique</h1>
          <p className="salon-error">{error || 'Salon introuvable, hé bé.'}</p>
        </div>
      </Layout>
    );
  }

  const { salon, stats, games, gallery } = data;

  return (
    <Layout className="salon-history-page">
      <div className="salon-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/salons'))}
        >← Retour</button>
        <h1 className="salon-title">{salon.name}</h1>
        <p className="salon-subtitle">
          {salon.gameCount === 0
            ? 'Pas encore joué une partie ici, hé bé !'
            : <>
                <strong>{salon.gameCount}</strong> partie{salon.gameCount > 1 ? 's bien tassées' : ' tassée'}
                {' · '}
                <strong>{totals.totalChallenges}</strong> défi{totals.totalChallenges > 1 ? 's relevés' : ' relevé'}
                {' · '}
                <strong>{totals.totalMedia}</strong> photo{totals.totalMedia > 1 ? 's' : ''}
              </>}
        </p>
        {salon.status !== 'ended' && (
          <button
            className="btn btn-gold btn-sm"
            onClick={() => navigate(`/salon/${code}`)}
            style={{ alignSelf: 'flex-start' }}
          >
            Y retourner !
          </button>
        )}
      </div>

      <div className="history-tabs">
        <button className={`history-tab ${tab === 'parties' ? 'active' : ''}`} onClick={() => setTab('parties')}>
          Les parties
        </button>
        <button className={`history-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          Le tableau
        </button>
        <button className={`history-tab ${tab === 'galerie' ? 'active' : ''}`} onClick={() => setTab('galerie')}>
          Galerie
        </button>
      </div>

      {tab === 'parties' && (
        games.length === 0 ? (
          <EmptyState
            icon="trophy"
            title="Pas une seule partie, oh fada !"
            description="Lancez une partie dans le salon, et tout se range ici tout seul."
          />
        ) : (
          <div className="history-games">
            {games.map((g, i) => {
              const sorted = [...(g.scores || [])].sort((a, b) => b.score - a.score);
              const top = sorted[0];
              return (
                <motion.button
                  type="button"
                  key={`${g.completedAt}-${i}`}
                  className="history-game-card"
                  onClick={() => setOpenGame(g)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="history-game-head">
                    <span className="history-game-date">{formatDate(g.completedAt)}</span>
                    {top && (
                      <span className="history-game-winner">
                        <Icon name="trophy" size={14} /> {top.pseudo} ({top.score} pts)
                      </span>
                    )}
                  </div>
                  <div className="history-game-scores">
                    {sorted.map((s) => (
                      <span key={s.playerId || s.pseudo} className="history-game-score">
                        {s.pseudo} <strong>{s.score}</strong>
                      </span>
                    ))}
                  </div>
                  <div className="history-game-meta">
                    <span>{g.challengeCount} défi{g.challengeCount > 1 ? 's' : ''} relevé{g.challengeCount > 1 ? 's' : ''}</span>
                    {g.mediaCount > 0 && <span>· {g.mediaCount} photo{g.mediaCount > 1 ? 's' : ''}</span>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )
      )}

      {tab === 'stats' && (
        stats.length === 0 ? (
          <EmptyState
            icon="football"
            title="Encore vide, té"
            description="Les chiffres tombent dès la première partie jouée."
          />
        ) : (
          <div className="history-stats">
            <div className="history-stats-row history-stats-row--head">
              <span>Le joueur</span>
              <span>Parties</span>
              <span>Faits</span>
              <span>Refusés</span>
              <span>Points</span>
              <span>Forme</span>
            </div>
            {stats.map((s) => {
              const total = s.totalCompleted + s.totalRefused;
              const rate = total > 0 ? Math.round((s.totalCompleted / total) * 100) : 0;
              return (
                <div key={s.pseudo} className="history-stats-row">
                  <span className="history-stats-name">
                    {s.pseudo}
                    {s.isHost && <span className="history-stats-host">host</span>}
                  </span>
                  <span>{s.gamesPlayed}</span>
                  <span className="history-stats-good">{s.totalCompleted}</span>
                  <span className="history-stats-bad">{s.totalRefused}</span>
                  <span className="history-stats-points">{s.totalPoints}</span>
                  <span>{total > 0 ? `${rate}%` : '—'}</span>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'galerie' && (
        gallery.length === 0 ? (
          <EmptyState
            icon="camera"
            title="Galerie vide, hé bé !"
            description="Les photos prises pendant les parties Premium se rangent ici, comme à l'apéro chez Mireille."
          />
        ) : (
          <div className="history-gallery">
            {gallery.map((m, i) => (
              <button
                type="button"
                key={`${m.url}-${i}`}
                className="history-gallery-tile"
                onClick={() => setLightbox(m)}
              >
                <img src={m.url} alt={m.challengeText} loading="lazy" />
                <span className="history-gallery-caption">{m.playerName}</span>
              </button>
            ))}
          </div>
        )
      )}

      {/* Drill-down d'une partie */}
      <AnimatePresence>
        {openGame && (
          <motion.div
            className="salon-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenGame(null)}
          >
            <motion.div
              className="history-game-modal"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="salon-modal-title" style={{ color: 'var(--bleu-azur)' }}>
                La partie du {formatDate(openGame.completedAt)}
              </h3>
              <div className="history-game-modal-scores">
                {[...openGame.scores].sort((a, b) => b.score - a.score).map((s, i) => (
                  <span key={s.playerId || s.pseudo} className={`history-rank rank-${i + 1}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`} {s.pseudo} — {s.score} pts
                  </span>
                ))}
              </div>
              <div className="history-game-modal-history">
                {(openGame.history || []).map((h, i) => (
                  <div key={i} className={`history-entry history-entry--${h.result}`}>
                    <span className="history-entry-player">{h.playerName}</span>
                    <span className="history-entry-text">{h.challengeText}</span>
                    <span className="history-entry-result">
                      {h.result === 'completed' ? `✓ +${h.points} pt${h.points > 1 ? 's' : ''}` : '✗ a calé'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="salon-modal-actions">
                <button className="btn btn-ghost" onClick={() => setOpenGame(null)}>OK, on s'en va</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox galerie */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="history-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.img
              src={lightbox.url}
              alt={lightbox.challengeText}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            />
            <div className="history-lightbox-caption">
              <strong>{lightbox.playerName}</strong> · {lightbox.challengeText}
              <button
                type="button"
                className="history-lightbox-report"
                onClick={(e) => { e.stopPropagation(); setReportTarget(lightbox); setLightbox(null); }}
              >
                <Icon name="cross" size={13} /> Signaler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signalement d'un média (modération owner-only) */}
      <AnimatePresence>
        {reportTarget && (
          <motion.div
            className="salon-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !reportBusy && setReportTarget(null)}
          >
            <motion.div
              className="history-game-modal"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="salon-modal-title" style={{ color: 'var(--rouge-defi)' }}>Signaler ce contenu</h3>
              <p className="salon-report-desc">
                Tu signales la photo de <strong>{reportTarget.playerName}</strong> au patron de l'instance,
                qui la vérifiera et la retirera si besoin.
              </p>
              <textarea
                className="input salon-report-reason"
                placeholder="Raison (optionnel)…"
                maxLength={300}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />
              <div className="salon-modal-actions">
                <button className="btn btn-danger" disabled={reportBusy} onClick={submitReport}>
                  {reportBusy ? 'Envoi…' : 'Envoyer le signalement'}
                </button>
                <button className="btn btn-ghost" disabled={reportBusy} onClick={() => setReportTarget(null)}>
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {reportMsg && (
        <div className="salon-report-toast" onClick={() => setReportMsg('')}>{reportMsg}</div>
      )}
    </Layout>
  );
}
