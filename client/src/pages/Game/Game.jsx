import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Roulette from '../../components/Roulette/Roulette';
import ChallengeCard from '../../components/ChallengeCard/ChallengeCard';
import PastisTimer from '../../components/PastisTimer/PastisTimer';
import VotePanel from '../../components/VotePanel/VotePanel';
import PlayerCard from '../../components/PlayerCard/PlayerCard';
import EndGame from '../../components/EndGame/EndGame';
import MediaUpload from '../../components/MediaUpload/MediaUpload';
import Icon from '../../components/Icon/Icon';
import useGameStore from '../../store/gameStore';
import useAuthStore from '../../store/authStore';
import { useSound } from '../../hooks/useSound';
import api from '../../services/api';
import './Game.css';

const RADAR_RESULTS = [
  "C'est bon, y'en a pas ici, on est entre nous.",
  "Zone sécurisée. Aucun Parisien détecté.",
  "Scan terminé. 0 touriste. 100% Marseille.",
];

export default function Game() {
  const navigate = useNavigate();
  const {
    session, pack, isSpinning, spinResult, currentChallenge,
    currentComment, exagerateurMode, soundEnabled, toggleSound,
    gameHistory,
    spin, nextPlayer, updatePlayerScore, addHistoryEntry,
    addMediaToLastEntry, resetGame, toggleExagerateur, getTimerDuration,
  } = useGameStore();
  const { user } = useAuthStore();
  const { play } = useSound();

  const [phase, setPhase] = useState('idle'); // idle | spinning | challenge | vote | result | endgame
  const [timerRunning, setTimerRunning] = useState(false);
  const [lastPoints, setLastPoints] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [radarResult, setRadarResult] = useState(null);
  const [radarVisible, setRadarVisible] = useState(false);
  const [radarScanning, setRadarScanning] = useState(false);

  if (!session || !pack) {
    return <Navigate to="/" replace />;
  }

  const currentPlayer = session.players[session.currentPlayerIndex];
  const sortedPlayers = [...session.players].sort((a, b) => b.score - a.score);
  const timerDuration = getTimerDuration();

  const handleSpin = async () => {
    if (isSpinning) return;
    play('spin');
    setPhase('spinning');
    setLastPoints(null);
    await spin();
    play('stop');
    setPhase('challenge');
    setTimerRunning(true);
  };

  const handleRelance = async () => {
    setTimerRunning(false);
    addHistoryEntry(currentPlayer.name, 'refused');
    play('spin');
    setPhase('spinning');
    await spin();
    play('stop');
    setPhase('challenge');
    setTimerRunning(true);
  };

  const handleVote = (result) => {
    setTimerRunning(false);
    let points = 0;
    if (result === 'completed') {
      play('validate');
      points = updatePlayerScore(currentPlayer.name, currentChallenge?.intensity?.level || 1);
      setLastPoints(points);
    } else {
      play('refuse');
      addHistoryEntry(currentPlayer.name, 'refused');
    }
    setPhase('result');
  };

  const handleNext = () => {
    nextPlayer();
    setPhase('idle');
    setLastPoints(null);
  };

  const handleEndGame = async () => {
    try {
      const res = await api.post('/sessions', {
        players: session.players,
        packId: pack._id,
        history: useGameStore.getState().gameHistory,
      });
      setShareLink(res.data.shareLink);
    } catch {}
    setPhase('endgame');
  };

  const handleRestart = () => {
    resetGame();
    navigate('/session/setup');
  };

  const handleRadar = () => {
    setRadarVisible(true);
    setRadarScanning(true);
    setRadarResult(null);
    setTimeout(() => {
      setRadarScanning(false);
      setRadarResult(RADAR_RESULTS[Math.floor(Math.random() * RADAR_RESULTS.length)]);
    }, 2500);
  };

  if (phase === 'endgame') {
    return (
      <EndGame
        players={session.players}
        packName={pack.name}
        shareLink={shareLink}
        history={gameHistory}
        onRestart={handleRestart}
        onHome={() => { resetGame(); navigate('/'); }}
      />
    );
  }

  return (
    <Layout className="game-page">
      {/* Header scores */}
      <div className="game-scores">
        {session.players.map((p) => (
          <div key={p.name} className={`score-chip ${p.name === currentPlayer.name ? 'active' : ''}`}>
            <span className="score-name">{p.name}</span>
            <span className="score-pts">{p.score}</span>
          </div>
        ))}

        <button className="sound-btn" onClick={toggleSound} title="Sons" aria-label="toggle son">
          <Icon name={soundEnabled ? 'sound-on' : 'sound-off'} size={18} />
        </button>

        {/* Radar à Parisiens — bouton caché */}
        <button className="radar-btn" onClick={handleRadar} title="..." aria-label="radar">
          <Icon name="radar" size={18} />
        </button>
      </div>

      {/* Colonne gauche desktop : roulette */}
      <div className="game-roulette-area">
        <motion.div
          className="game-active-player"
          key={currentPlayer.name}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="game-turn-label">À toi de jouer,</span>
          <span className="game-turn-name">{currentPlayer.name} !</span>
          {exagerateurMode && <span className="exagerateur-badge"><Icon name="lightning" size={12} style={{ marginRight: 2 }} /> x2</span>}
        </motion.div>

        <Roulette
          challenges={pack.challenges}
          targetIndex={spinResult}
          isSpinning={isSpinning}
          onSpinEnd={() => {}}
        />

        {phase === 'challenge' && !isSpinning && (
          <motion.p className="game-comment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            {currentComment}
          </motion.p>
        )}
      </div>

      {/* Colonne droite desktop : contenu */}
      <div className="game-content">
        <AnimatePresence mode="wait">

          {phase === 'idle' && (
            <motion.div key="idle" className="game-idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                className={`btn btn-gold game-spin-btn ${exagerateurMode ? 'exagerateur-on' : ''}`}
                onClick={handleSpin}
              >
                TOURNER LA ROULETTE
              </button>
              <button
                className={`btn exagerateur-toggle ${exagerateurMode ? 'active' : ''}`}
                onClick={toggleExagerateur}
              >
                <Icon name="lightning" size={16} style={{ marginRight: 6 }} />
                {exagerateurMode ? "L'Exagérateur actif (x2)" : "Activer l'Exagérateur"}
              </button>
            </motion.div>
          )}

          {phase === 'spinning' && (
            <motion.div key="spinning" className="game-spinning-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <motion.div
                className="game-spinning-dots"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <Icon name="dots" size={40} />
              </motion.div>
              <p className="game-spinning-text">La roulade est lancée…</p>
              <motion.p
                className="game-spinning-comment"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              >
                {currentComment}
              </motion.p>
            </motion.div>
          )}

          {phase === 'challenge' && currentChallenge && (
            <motion.div key="challenge" className="game-challenge-area" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ChallengeCard
                challenge={currentChallenge}
                playerName={currentPlayer.name}
                caseNumber={(spinResult ?? 0) + 1}
              />
              <div className="game-timer-row">
                <PastisTimer duration={timerDuration} running={timerRunning} onExpire={() => setTimerRunning(false)} />
                <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { setTimerRunning(false); setPhase('vote'); }}>
                    Voter →
                  </button>
                  <button className="btn-excuse" onClick={handleRelance}>
                    "C'est pas ma faute !"
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'vote' && (
            <motion.div key="vote" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <VotePanel
                players={session.players}
                activePlayerName={currentPlayer.name}
                onVote={handleVote}
                onSkip={() => { addHistoryEntry(currentPlayer.name, 'refused'); setPhase('result'); }}
              />
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div key="result" className="game-result"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>

              {lastPoints !== null && (
                <motion.div className="game-points-flash"
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}>
                  +{lastPoints} pt{lastPoints > 1 ? 's' : ''} {exagerateurMode && <Icon name="lightning" size={28} style={{ marginLeft: 4 }} />}
                </motion.div>
              )}

              <div className="game-result-scores">
                {sortedPlayers.map((p, i) => (
                  <PlayerCard key={p.name} player={p} isActive={p.name === currentPlayer.name} rank={i + 1} />
                ))}
              </div>

              {lastPoints !== null && (
                <MediaUpload onUploaded={addMediaToLastEntry} />
              )}

              <div className="game-result-actions">
                <button className="btn btn-gold" style={{ width: '100%' }} onClick={handleNext}>
                  Tour suivant →
                </button>
                <button className="btn btn-end-game" style={{ width: '100%' }} onClick={handleEndGame}>
                  Terminer la partie
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Radar à Parisiens — modale */}
      <AnimatePresence>
        {radarVisible && (
          <motion.div className="radar-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !radarScanning && setRadarVisible(false)}>
            <motion.div className="radar-modal"
              initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
              <h3 className="radar-title"><Icon name="radar" size={22} style={{ marginRight: 8 }} />Radar à Parisiens</h3>
              {radarScanning ? (
                <div className="radar-scanning">
                  <div className="radar-sonar">
                    <motion.div className="radar-sweep"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                  </div>
                  <p>Scan en cours...</p>
                </div>
              ) : (
                <motion.p className="radar-result"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {radarResult}
                </motion.p>
              )}
              {!radarScanning && (
                <button className="btn btn-primary btn-sm" onClick={() => setRadarVisible(false)}>
                  Parfait, on continue !
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
