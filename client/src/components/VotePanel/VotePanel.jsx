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

export default function VotePanel({ players, activePlayerName, onVote, onSkip }) {
  const [votes, setVotes] = useState({});
  const [excuse] = useState(EXCUSES[Math.floor(Math.random() * EXCUSES.length)]);

  const otherPlayers = players.filter((p) => p.name !== activePlayerName);

  const castVote = (playerName, val) => {
    setVotes((v) => ({ ...v, [playerName]: val }));
  };

  const totalVotes = Object.values(votes).length;
  const positiveVotes = Object.values(votes).filter(Boolean).length;

  const canSubmit = totalVotes === otherPlayers.length;
  const majority = positiveVotes > otherPlayers.length / 2;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onVote(majority ? 'completed' : 'refused');
  };

  return (
    <motion.div
      className="vote-panel"
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
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

      <button
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 16 }}
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        Valider le verdict
      </button>

      <button className="vote-excuse-btn" onClick={() => onSkip(excuse)}>
        "C'est pas ma faute !" — {excuse}
      </button>
    </motion.div>
  );
}
