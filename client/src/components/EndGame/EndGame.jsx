import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './EndGame.css';

const FUN_STATS = [
  (p) => `${p.name} a été le plus courageux de la soirée !`,
  (p) => `${p.name} : un champion est né !`,
  (p) => `${p.name} aurait gagné même les yeux fermés.`,
];

const LOSER_STATS = [
  (p) => `${p.name}... on va dire que c'était une mauvaise nuit.`,
  (p) => `${p.name} a donné tout ce qu'il avait. C'était pas assez.`,
  (p) => `${p.name} repassera l'année prochaine.`,
];

export default function EndGame({ players, packName, shareLink, onRestart, onHome }) {
  const navigate = useNavigate();
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const loser = sorted[sorted.length - 1];
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const winnerStat = FUN_STATS[Math.floor(Math.random() * FUN_STATS.length)](winner);
  const loserStat = players.length > 1
    ? LOSER_STATS[Math.floor(Math.random() * LOSER_STATS.length)](loser)
    : null;

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <div className="endgame">
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                background: ['#C9A84C', '#0057A8', '#E63946', '#2DC653'][i % 4],
              }}
              initial={{ y: -20, opacity: 1 }}
              animate={{ y: '100vh', opacity: 0, rotate: Math.random() * 360 }}
              transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5 }}
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
        <div className="endgame-header">
          <p className="endgame-pack">Pack : {packName}</p>
          <h1 className="endgame-title">C'est fini !</h1>
          <p className="endgame-winner-stat">{winnerStat}</p>
        </div>

        <div className="endgame-podium">
          {sorted.map((p, i) => (
            <motion.div
              key={p.name}
              className={`endgame-player-row ${i === 0 ? 'winner' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <span className="endgame-medal">{MEDALS[i] || `${i + 1}.`}</span>
              <span className="endgame-player-name">{p.name}</span>
              <span className="endgame-player-score">{p.score} pts</span>
            </motion.div>
          ))}
        </div>

        {loserStat && (
          <p className="endgame-loser-stat">{loserStat}</p>
        )}

        <div className="endgame-actions">
          {shareLink && (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/gallery/${shareLink}`)}>
              📸 Voir la galerie
            </button>
          )}
          <button className="btn btn-gold" style={{ width: '100%' }} onClick={onRestart}>
            Rejouer
          </button>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onHome}>
            Retour à l'accueil
          </button>
        </div>
      </motion.div>
    </div>
  );
}
