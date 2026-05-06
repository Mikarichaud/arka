import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import useSessionStore from '../../store/sessionStore';
import useGameStore from '../../store/gameStore';
import api from '../../services/api';
import './SessionSetup.css';

export default function SessionSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedPackId = location.state?.preselectedPackId || null;
  const { setPlayerNames, setSelectedPackId } = useSessionStore();
  const { setSession, setPack } = useGameStore();
  const [players, setPlayers] = useState(['', '']);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [preselectedPackName, setPreselectedPackName] = useState(null);

  useEffect(() => {
    if (!preselectedPackId) return;
    api.get(`/packs/${preselectedPackId}`)
      .then(({ data }) => {
        if (!data.locked) setPreselectedPackName(data.pack.name);
      })
      .catch(() => {});
  }, [preselectedPackId]);

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

  const handleNext = async () => {
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

    // Pack pré-sélectionné depuis la PackLibrary → on saute la PackSelection.
    if (preselectedPackId) {
      setStarting(true);
      try {
        const { data } = await api.get(`/packs/${preselectedPackId}`);
        if (data.locked) {
          // Pack verrouillé entre temps → on retombe sur la sélection avec paywall
          setSelectedPackId(preselectedPackId);
          navigate('/session/pack');
          return;
        }
        const pack = data.pack;
        const session = {
          players: names.map((name) => ({ name, score: 0 })),
          currentPlayerIndex: 0,
          pack: pack._id,
        };
        setSession(session);
        setPack(pack);
        navigate('/game');
      } catch {
        setError("Impossible de lancer la partie, réessaie.");
        setStarting(false);
      }
      return;
    }

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

      {preselectedPackName && (
        <motion.div
          className="setup-preselected"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Icon name="check" size={16} />
          <span>Pack pré-sélectionné : <strong>{preselectedPackName}</strong></span>
        </motion.div>
      )}

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
          <Icon name="shuffle" size={18} style={{ marginRight: 6 }} />
          Mélanger l'ordre
        </button>
      </div>

      {error && <p className="setup-error">{error}</p>}

      <button
        className="btn btn-gold"
        style={{ width: '100%', marginTop: 'auto', padding: '18px', fontSize: '1.1rem' }}
        onClick={handleNext}
        disabled={starting}
      >
        {starting
          ? 'Préparation...'
          : preselectedPackId
            ? 'Lancer la Roulade !'
            : 'Choisir le pack →'}
      </button>
    </Layout>
  );
}
