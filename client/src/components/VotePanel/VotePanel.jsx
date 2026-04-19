import { useState } from 'react';
import { motion } from 'framer-motion';
import './VotePanel.css';

const EXCUSES = [
  "Y'avait trop de Mistral de face",
  "Mon genou il souffre depuis 92",
  "J'étais en train de digérer la bouillabaisse",
  "Le soleil il m'aveuglait, té !",
  "Je suis pas en forme aujourd'hui, demain c'est sûr",
];

// Variants fumigène — apparition depuis la fumée
const fumigenesVariants = {
  initial: { opacity: 0, scale: 0.88, filter: 'blur(8px)', y: 20 },
  animate: {
    opacity: 1, scale: 1, filter: 'blur(0px)', y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 22 },
  },
  exit: {
    opacity: 0, scale: 0.92, filter: 'blur(6px)', y: -10,
    transition: { duration: 0.2 },
  },
};

export default function VotePanel({ players, activePlayerName, onVote, onSkip }) {
  const [votes, setVotes] = useState({});
  const [excuse] = useState(EXCUSES[Math.floor(Math.random() * EXCUSES.length)]);
  const [isAnimating, setIsAnimating] = useState(false);

  const otherPlayers = players.filter((p) => p.name !== activePlayerName);
  const castVote = (playerName, val) => setVotes((v) => ({ ...v, [playerName]: val }));

  const totalVotes = Object.values(votes).length;
  const positiveVotes = Object.values(votes).filter(Boolean).length;
  const canSubmit = totalVotes === otherPlayers.length;
  const majority = positiveVotes > otherPlayers.length / 2;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      onVote(majority ? 'completed' : 'refused');
    }, 220);
  };

  return (
    <motion.div
      className="vote-panel"
      variants={fumigenesVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <h3 className="vote-title">Le jury délibère</h3>
      <p className="vote-subtitle">{activePlayerName} a-t-il relevé le défi ?</p>

      <div className="vote-list">
        {otherPlayers.map((p) => (
          <div key={p.name} className="vote-row">
            <span className="vote-player-name">{p.name}</span>
            <div className="vote-btns">
              <button
                className={`vote-btn vote-yes ${votes[p.name] === true ? 'active' : ''}`}
                onClick={() => castVote(p.name, true)}
              >Oui</button>
              <button
                className={`vote-btn vote-no ${votes[p.name] === false ? 'active' : ''}`}
                onClick={() => castVote(p.name, false)}
              >Non</button>
            </div>
          </div>
        ))}
      </div>

      <motion.button
        className={`btn btn-primary btn-carreau ${isAnimating ? 'animating' : ''}`}
        style={{ width: '100%', marginTop: 16 }}
        onClick={handleSubmit}
        disabled={!canSubmit}
        whileTap={canSubmit ? { scale: 0.93 } : {}}
        animate={isAnimating ? { scale: [1, 0.92, 1.05, 1] } : {}}
        transition={{ duration: 0.22, ease: [0.175, 0.885, 0.32, 1.275] }}
      >
        Valider le verdict
      </motion.button>

      <button className="vote-excuse-btn" onClick={() => onSkip(excuse)}>
        "C'est pas ma faute !" — {excuse}
      </button>
    </motion.div>
  );
}
