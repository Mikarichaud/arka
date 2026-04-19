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
      initial={{ opacity: 0, scale: 0.88, filter: 'blur(10px)', y: 16 }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
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
