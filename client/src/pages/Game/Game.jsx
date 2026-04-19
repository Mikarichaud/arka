import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Roulette from '../../components/Roulette/Roulette';
import ChallengeCard from '../../components/ChallengeCard/ChallengeCard';
import PastisTimer from '../../components/PastisTimer/PastisTimer';
import VotePanel from '../../components/VotePanel/VotePanel';
import PlayerCard from '../../components/PlayerCard/PlayerCard';
import useGameStore from '../../store/gameStore';
import api from '../../services/api';
import './Game.css';

const COMMENTS = [
  "Oh, c'est cadeau ça !",
  "À ta place, je rentrerais à la maison direct !",
  "Même mon minot il le fait les yeux fermés !",
  "Allez, sois pas fada, c'est simple !",
  "Té, t'as de la chance aujourd'hui !",
  "On s'attendait à mieux de ta part...",
];

export default function Game() {
  const navigate = useNavigate();
  const { session, pack, isSpinning, spinResult, currentChallenge, spin, nextPlayer, updatePlayerScore, resetGame } = useGameStore();
  const [phase, setPhase] = useState('idle'); // idle | spinning | challenge | vote | result
  const [comment] = useState(COMMENTS[Math.floor(Math.random() * COMMENTS.length)]);
  const [timerRunning, setTimerRunning] = useState(false);

  if (!session || !pack) {
    navigate('/');
    return null;
  }

  const currentPlayer = session.players[session.currentPlayerIndex];
  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score);

  const handleSpin = async () => {
    if (isSpinning) return;
    setPhase('spinning');
    const { result, challenge } = await spin(session._id);
    setPhase('challenge');
    setTimerRunning(true);
  };

  const handleVote = (result) => {
    if (result === 'completed') {
      updatePlayerScore(currentPlayer.name, currentChallenge?.intensity?.level || 1);
    }
    setTimerRunning(false);
    setPhase('result');
  };

  const handleSkip = (excuse) => {
    setTimerRunning(false);
    setPhase('result');
  };

  const handleNext = () => {
    nextPlayer();
    setPhase('idle');
  };

  const handleEndGame = () => {
    resetGame();
    navigate('/');
  };

  return (
    <Layout className="game-page">
      {/* Header : scores (full width desktop) */}
      <div className="game-scores">
        {session.players.map((p) => (
          <div key={p.name} className={`score-chip ${p.name === currentPlayer.name ? 'active' : ''}`}>
            <span className="score-name">{p.name}</span>
            <span className="score-pts">{p.score}</span>
          </div>
        ))}
      </div>

      {/* Colonne gauche desktop : roulette + joueur actif */}
      <div className="game-roulette-area">
        <motion.div
          className="game-active-player"
          key={currentPlayer.name}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="game-turn-label">À toi de jouer,</span>
          <span className="game-turn-name">{currentPlayer.name} !</span>
        </motion.div>

        <Roulette
          challenges={pack.challenges}
          targetIndex={spinResult}
          isSpinning={isSpinning}
          onSpinEnd={() => {}}
        />

        {phase === 'challenge' && !isSpinning && (
          <motion.p
            className="game-comment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {comment}
          </motion.p>
        )}
      </div>

      {/* Colonne droite desktop : actions */}
      <div className="game-content">
        <AnimatePresence mode="wait">
          {phase === 'idle' && (
            <motion.button
              key="spin-btn"
              className="btn btn-gold game-spin-btn"
              onClick={handleSpin}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              whileTap={{ scale: 0.94 }}
            >
              TOURNER LA ROULETTE
            </motion.button>
          )}

          {phase === 'spinning' && (
            <motion.p key="spinning" className="game-spinning-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              La roulade est lancée...
            </motion.p>
          )}

          {phase === 'challenge' && currentChallenge && (
            <motion.div key="challenge" className="game-challenge-area" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ChallengeCard
                challenge={currentChallenge}
                playerName={currentPlayer.name}
                caseNumber={(spinResult ?? 0) + 1}
              />
              <div className="game-timer-row">
                <PastisTimer duration={30} running={timerRunning} onExpire={() => setTimerRunning(false)} />
                <button className="btn btn-primary btn-sm" onClick={() => setPhase('vote')}>
                  Voter →
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'vote' && (
            <motion.div key="vote" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <VotePanel
                players={session.players}
                activePlayerName={currentPlayer.name}
                onVote={handleVote}
                onSkip={handleSkip}
              />
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div
              key="result"
              className="game-result"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring' }}
            >
              <div className="game-result-scores">
                {sortedPlayers.map((p, i) => (
                  <PlayerCard key={p.name} player={p} isActive={p.name === currentPlayer.name} rank={i + 1} />
                ))}
              </div>
              <div className="game-result-actions">
                <button className="btn btn-gold" style={{ flex: 1 }} onClick={handleNext}>
                  Tour suivant →
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleEndGame}>
                  Terminer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
