import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import useSessionStore from '../../store/sessionStore';
import './SessionSetup.css';

export default function SessionSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedPackId = location.state?.preselectedPackId || null;
  const { setPlayerNames, setSelectedPackId } = useSessionStore();
  const [players, setPlayers] = useState(['', '']);
  const [error, setError] = useState('');

  const addPlayer = () => {
    if (players.length >= 10) return;
    setPlayers([...players, '']);
  };

  const removePlayer = (i) => {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, idx) => idx !== i));
  };

  const updatePlayer = (i, val) => {
    const updated = [...players];
    updated[i] = val;
    setPlayers(updated);
  };

  const shufflePlayers = () => {
    setPlayers([...players].sort(() => Math.random() - 0.5));
  };

  const handleNext = () => {
    const names = players.map((p) => p.trim()).filter(Boolean);
    if (names.length < 2) {
      setError('Il faut au moins 2 joueurs, oh fada !');
      return;
    }
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length) {
      setError('Deux joueurs ont le même prénom, té !');
      return;
    }
    setPlayerNames(names);
    if (preselectedPackId) setSelectedPackId(preselectedPackId);
    navigate('/session/pack');
  };

  return (
    <Layout className="setup-page">
      <div className="setup-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="setup-title">Les Joueurs</h1>
        <p className="setup-subtitle">Qui joue aujourd'hui ?</p>
      </div>

      <div className="setup-players">
        <AnimatePresence>
          {players.map((name, i) => (
            <motion.div
              key={i}
              className="setup-player-row"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <span className="setup-player-num">{i + 1}</span>
              <input
                className="input"
                type="text"
                placeholder={`Joueur ${i + 1}`}
                value={name}
                onChange={(e) => updatePlayer(i, e.target.value)}
                maxLength={20}
              />
              {players.length > 2 && (
                <button className="setup-remove-btn" onClick={() => removePlayer(i)}>✕</button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="setup-actions">
        {players.length < 10 && (
          <button className="btn btn-ghost" onClick={addPlayer} style={{ width: '100%' }}>
            + Ajouter un joueur
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={shufflePlayers} style={{ alignSelf: 'center' }}>
          🔀 Mélanger l'ordre
        </button>
      </div>

      {error && <p className="setup-error">{error}</p>}

      <button
        className="btn btn-gold"
        style={{ width: '100%', marginTop: 'auto', padding: '18px', fontSize: '1.1rem' }}
        onClick={handleNext}
      >
        Choisir le pack →
      </button>
    </Layout>
  );
}
