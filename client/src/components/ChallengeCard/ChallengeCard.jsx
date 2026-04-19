import { motion } from 'framer-motion';
import './ChallengeCard.css';

const INTENSITY_LABELS = { 1: 'Facile', 2: 'Moyen', 3: 'Hard' };
const INTENSITY_CLASS = { 1: 'facile', 2: 'moyen', 3: 'hard' };

export default function ChallengeCard({ challenge, playerName, caseNumber }) {
  if (!challenge) return null;

  const lvl = challenge.intensity?.level || 1;

  return (
    <motion.div
      className={`challenge-card intensity-${INTENSITY_CLASS[lvl]}`}
      initial={{ scale: 0.85, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className="challenge-header">
        <span className="challenge-case">Case {caseNumber}</span>
        <span className={`badge badge-${INTENSITY_CLASS[lvl]}`}>
          {INTENSITY_LABELS[lvl]}
        </span>
      </div>
      {playerName && (
        <p className="challenge-player">C'est pour toi, {playerName} !</p>
      )}
      <p className="challenge-text">{challenge.text}</p>
    </motion.div>
  );
}
