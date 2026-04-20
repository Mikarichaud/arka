import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../Icon/Icon';
import './EndGame.css';

const WIN_LINES = [
  (p) => `${p} a tout écrasé comme une boule au carré !`,
  (p) => `${p} : un champion est né sur la piste !`,
  (p) => `${p} aurait gagné même les yeux fermés, té !`,
];
const LOSE_LINES = [
  (p) => `${p}… on va dire que c'était une mauvaise nuit.`,
  (p) => `${p} repassera l'année prochaine.`,
  (p) => `${p} a tout donné. C'était pas assez.`,
];

const MEDALS = ['medal-gold', 'medal-silver', 'medal-bronze'];
const TABS = ['Podium', 'Récap', 'Historique'];

export default function EndGame({ players, packName, shareLink, history = [], onRestart, onHome }) {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  const [tab, setTab] = useState(0);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const loser = sorted[sorted.length - 1];

  useEffect(() => {
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 3500);
    return () => clearTimeout(t);
  }, []);

  // ── Stats calculées depuis l'historique ──
  const totalRounds = history.length;
  const completed = history.filter((h) => h.result === 'completed').length;
  const refused = history.filter((h) => h.result === 'refused').length;
  const completionPct = totalRounds > 0 ? Math.round((completed / totalRounds) * 100) : 0;

  // Cases les plus sorties
  const caseCounts = {};
  history.forEach((h) => {
    if (h.caseNumber) caseCounts[h.caseNumber] = (caseCounts[h.caseNumber] || 0) + 1;
  });
  const maxCount = Math.max(...Object.values(caseCounts), 1);
  const topCase = Object.entries(caseCounts).sort((a, b) => b[1] - a[1])[0];

  // Stats par joueur
  const pStats = {};
  history.forEach((h) => {
    if (!pStats[h.playerName]) pStats[h.playerName] = { ok: 0, ko: 0, pts: 0 };
    if (h.result === 'completed') { pStats[h.playerName].ok++; pStats[h.playerName].pts += h.points; }
    else pStats[h.playerName].ko++;
  });

  const mvp = Object.entries(pStats).sort((a, b) => b[1].ok - a[1].ok)[0];
  const fada = Object.entries(pStats).sort((a, b) => b[1].ko - a[1].ko)[0];

  const winLine = WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)](winner.name);
  const loseLine = players.length > 1
    ? LOSE_LINES[Math.floor(Math.random() * LOSE_LINES.length)](loser.name)
    : null;

  return (
    <div className="endgame">
      {/* Confettis */}
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                background: ['#C9A84C', '#0057A8', '#E63946', '#2DC653', '#ffffff'][i % 5],
                borderRadius: i % 3 === 0 ? '50%' : '2px',
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{ y: '105vh', opacity: 0, rotate: Math.random() * 720 - 360 }}
              transition={{ duration: 2.5 + Math.random() * 1.5, delay: Math.random() * 0.8 }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="endgame-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        {/* Header */}
        <div className="endgame-header">
          <p className="endgame-pack">Pack : {packName}</p>
          <h1 className="endgame-title">C'est fini !</h1>
          <p className="endgame-winner-stat">{winLine}</p>
        </div>

        {/* Onglets */}
        <div className="endgame-tabs">
          {TABS.map((t, i) => (
            <button
              key={t}
              className={`endgame-tab ${tab === i ? 'active' : ''}`}
              onClick={() => setTab(i)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Contenu par onglet */}
        <AnimatePresence mode="wait">

          {/* ── Onglet Podium ── */}
          {tab === 0 && (
            <motion.div key="podium"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="endgame-podium"
            >
              {sorted.map((p, i) => (
                <motion.div
                  key={p.name}
                  className={`endgame-player-row ${i === 0 ? 'winner' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <span className="endgame-medal">{MEDALS[i] ? <Icon name={MEDALS[i]} size={28} /> : `${i + 1}.`}</span>
                  <div className="endgame-player-info">
                    <span className="endgame-player-name">{p.name}</span>
                    {pStats[p.name] && (
                      <span className="endgame-player-detail">
                        {pStats[p.name].ok} réussi · {pStats[p.name].ko} refusé
                      </span>
                    )}
                  </div>
                  <span className="endgame-player-score">{p.score} pts</span>
                </motion.div>
              ))}
              {loseLine && <p className="endgame-loser-stat">{loseLine}</p>}
            </motion.div>
          )}

          {/* ── Onglet Récap ── */}
          {tab === 1 && (
            <motion.div key="recap"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="endgame-recap"
            >
              {/* Stats rapides */}
              <div className="recap-stats-row">
                <div className="recap-stat">
                  <span className="recap-stat-val">{totalRounds}</span>
                  <span className="recap-stat-label">Tours joués</span>
                </div>
                <div className="recap-stat">
                  <span className="recap-stat-val" style={{ color: '#2DC653' }}>{completed}</span>
                  <span className="recap-stat-label">Réussis</span>
                </div>
                <div className="recap-stat">
                  <span className="recap-stat-val" style={{ color: '#E63946' }}>{refused}</span>
                  <span className="recap-stat-label">Refusés</span>
                </div>
              </div>

              {/* Barre réussite */}
              {totalRounds > 0 && (
                <div className="recap-bar-wrap">
                  <div className="recap-bar-label">
                    <span>Taux de courage</span>
                    <span style={{ color: '#2DC653', fontWeight: 700 }}>{completionPct}%</span>
                  </div>
                  <div className="recap-bar-bg">
                    <motion.div
                      className="recap-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              {/* Distribution des cases */}
              {Object.keys(caseCounts).length > 0 && (
                <div className="recap-cases">
                  <p className="recap-section-title">Cases sorties</p>
                  <div className="recap-cases-grid">
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => {
                      const count = caseCounts[n] || 0;
                      const height = count > 0 ? Math.max(20, (count / maxCount) * 60) : 6;
                      return (
                        <div key={n} className="recap-case-col">
                          <span className="recap-case-count">{count > 0 ? count : ''}</span>
                          <motion.div
                            className={`recap-case-bar ${count === 0 ? 'empty' : ''}`}
                            initial={{ height: 4 }}
                            animate={{ height }}
                            transition={{ duration: 0.6, delay: n * 0.05 }}
                          />
                          <span className="recap-case-num">{n}</span>
                        </div>
                      );
                    })}
                  </div>
                  {topCase && (
                    <p className="recap-case-top">
                      Case {topCase[0]} la plus jouée — {topCase[1]}x
                    </p>
                  )}
                </div>
              )}

              {/* Distinctions */}
              <div className="recap-distinctions">
                {mvp && mvp[1].ok > 0 && (
                  <div className="recap-distinction gold">
                    <span className="recap-dist-icon"><Icon name="trophy" size={22} /></span>
                    <div>
                      <p className="recap-dist-title">Le plus courageux</p>
                      <p className="recap-dist-name">{mvp[0]} — {mvp[1].ok} défi{mvp[1].ok > 1 ? 's' : ''} réussi{mvp[1].ok > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}
                {fada && fada[1].ko > 0 && players.length > 1 && (
                  <div className="recap-distinction red">
                    <span className="recap-dist-icon"><Icon name="pinch" size={22} /></span>
                    <div>
                      <p className="recap-dist-title">Le plus fada</p>
                      <p className="recap-dist-name">{fada[0]} — {fada[1].ko} refus</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Onglet Historique ── */}
          {tab === 2 && (
            <motion.div key="history"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="endgame-history"
            >
              {history.length === 0 ? (
                <p className="history-empty">Aucun tour enregistré.</p>
              ) : (
                <div className="history-list">
                  {history.map((entry, i) => (
                    <motion.div
                      key={i}
                      className={`history-entry ${entry.result}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="history-entry-left">
                        <span className="history-case">#{entry.caseNumber}</span>
                        <span className={`history-result-dot ${entry.result}`} />
                      </div>
                      <div className="history-entry-body">
                        <span className="history-player">{entry.playerName}</span>
                        <span className="history-challenge">{entry.challengeText || '—'}</span>
                      </div>
                      <div className="history-entry-right">
                        {entry.result === 'completed'
                          ? <span className="history-pts">+{entry.points}pt</span>
                          : <span className="history-refused"><Icon name="cross" size={14} /></span>
                        }
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {/* Actions */}
        <div className="endgame-actions">
          {shareLink && (
            <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => navigate(`/gallery/${shareLink}`)}>
              <Icon name="photo" size={18} /> Voir la galerie
            </button>
          )}
          <button className="btn btn-gold" style={{ width: '100%' }} onClick={onRestart}>
            Rejouer
          </button>
          <button className="btn btn-ghost endgame-ghost" style={{ width: '100%' }} onClick={onHome}>
            Retour à l'accueil
          </button>
        </div>
      </motion.div>
    </div>
  );
}
