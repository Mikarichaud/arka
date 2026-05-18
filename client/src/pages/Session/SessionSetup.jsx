import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import PaywallModal from '../../components/PaywallModal/PaywallModal';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import { useCategories } from '../../hooks/useCategories';
import useSessionStore from '../../store/sessionStore';
import useGameStore from '../../store/gameStore';
import api from '../../services/api';
import './SessionSetup.css';

export default function SessionSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedPackId = location.state?.preselectedPackId || null;
  const { selectedPackId, setSelectedPackId, setPlayerNames } = useSessionStore();
  const { setSession, setPack } = useGameStore();

  const [step, setStep] = useState(1); // 1 = joueurs, 2 = pack
  const [players, setPlayers] = useState(['', '']);
  const [packs, setPacks] = useState([]);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [paywallPack, setPaywallPack] = useState(null);
  const { categories } = useCategories();

  const catBySlug = useMemo(() => {
    const m = {};
    for (const c of categories) m[c.slug] = c;
    return m;
  }, [categories]);

  useEffect(() => {
    api.get('/packs')
      .then(({ data }) => setPacks(data.packs))
      .catch(() => {})
      .finally(() => setLoadingPacks(false));
  }, []);

  useEffect(() => {
    if (preselectedPackId) setSelectedPackId(preselectedPackId);
  }, [preselectedPackId, setSelectedPackId]);

  const selectedPack = useMemo(
    () => packs.find((p) => p._id === selectedPackId) || null,
    [packs, selectedPackId]
  );

  const sortedPacks = useMemo(
    () => [...packs].sort((a, b) => (b.isMine ? 1 : 0) - (a.isMine ? 1 : 0)),
    [packs]
  );

  const validNames = players.map((p) => p.trim()).filter(Boolean);
  const hasDupes = validNames.filter((n, i) => validNames.indexOf(n) !== i).length > 0;
  const playersValid = validNames.length >= 2 && !hasDupes;

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

  const handlePackClick = (pack) => {
    if (pack.isPremium && !pack.accessible) {
      setPaywallPack(pack);
      return;
    }
    setSelectedPackId(pack._id);
  };

  const handleNextFromPlayers = () => {
    setError('');
    if (validNames.length < 2) {
      setError('Il faut au moins 2 joueurs, oh fada !');
      return;
    }
    if (hasDupes) {
      setError('Deux joueurs ont le même prénom, té !');
      return;
    }
    // Si un pack est déjà pré-sélectionné depuis PackLibrary, on lance direct.
    if (preselectedPackId) {
      handleStart();
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setError('');
    if (step === 2) {
      setStep(1);
      return;
    }
    if (location.key !== 'default') navigate(-1);
    else navigate('/');
  };

  const handleStart = async () => {
    setError('');
    if (!selectedPackId) {
      setError('Choisis un pack pour lancer la partie !');
      return;
    }
    setPlayerNames(validNames);
    setStarting(true);
    try {
      const { data } = await api.get(`/packs/${selectedPackId}`);
      if (data.locked) {
        setPaywallPack(data.pack);
        setStarting(false);
        return;
      }
      const pack = data.pack;
      const session = {
        players: validNames.map((name) => ({ name, score: 0 })),
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
  };

  return (
    <Layout className="setup-page">
      <div className="setup-header">
        <button className="btn-back" onClick={handleBack}>← Retour</button>
        <div className="setup-step-indicator">
          <span className={`setup-step-dot ${step === 1 ? 'active' : 'done'}`}>1</span>
          <span className="setup-step-bar" />
          <span className={`setup-step-dot ${step === 2 ? 'active' : ''}`}>2</span>
        </div>
        <h1 className="setup-title">
          {step === 1 ? 'Les Joueurs' : 'Choix du Pack'}
        </h1>
        <p className="setup-subtitle">
          {step === 1 ? 'Qui joue aujourd\'hui ?' : "Quelle ambiance on se fait ?"}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.section
            key="step-players"
            className="setup-section"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
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
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="step-pack"
            className="setup-section"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.25 }}
          >
            {loadingPacks ? (
              <LoadingPlaceholder variant="list" count={4} label="Chargement des packs" />
            ) : (
              <div className="setup-packs-grid">
                {sortedPacks.map((pack, i) => {
                  const isSelected = selectedPackId === pack._id;
                  const isLocked = pack.isPremium && !pack.accessible;
                  return (
                    <motion.div
                      key={pack._id}
                      className={`pack-card ${isSelected ? 'pack-card--selected' : ''} ${isLocked ? 'pack-card--premium' : ''}`}
                      onClick={() => handlePackClick(pack)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.3) }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="pack-icon"><Icon name={catBySlug[pack.theme]?.icon || 'wheel'} size={24} /></span>
                      <div className="pack-info">
                        <span className="pack-name">{pack.name}</span>
                        <span className="pack-desc">{pack.description}</span>
                      </div>
                      {isLocked ? (
                        <span className="pack-premium-badge"><Icon name="lock" size={16} /></span>
                      ) : isSelected ? (
                        <span className="pack-check"><Icon name="check" size={16} /></span>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {error && <p className="setup-error">{error}</p>}

      <div className="setup-cta-bar">
        {step === 2 && selectedPack && (
          <p className="setup-cta-hint">
            <Icon name="check" size={14} />
            <span>Pack : <strong>{selectedPack.name}</strong></span>
          </p>
        )}
        {step === 1 ? (
          <button
            className="btn btn-primary setup-cta-btn"
            onClick={handleNextFromPlayers}
            disabled={!playersValid || starting}
          >
            {starting ? 'Préparation...' : preselectedPackId ? 'Lancer la Roulade !' : 'Choisir le pack →'}
          </button>
        ) : (
          <button
            className="btn btn-gold setup-cta-btn"
            onClick={handleStart}
            disabled={!selectedPack || starting}
          >
            {starting ? 'Préparation...' : 'Lancer la Roulade !'}
          </button>
        )}
      </div>

      <PaywallModal pack={paywallPack} onClose={() => setPaywallPack(null)} />
    </Layout>
  );
}
