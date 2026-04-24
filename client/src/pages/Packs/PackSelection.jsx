import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import PaywallModal from '../../components/PaywallModal/PaywallModal';
import useSessionStore from '../../store/sessionStore';
import useGameStore from '../../store/gameStore';
import api from '../../services/api';
import './PackSelection.css';

const THEME_ICONS = {
  marseillais: 'anchor',
  amis: 'party',
  sportif: 'football',
  couple: 'heart',
  enfants: 'balloon',
  custom: 'pencil',
};

export default function PackSelection() {
  const navigate = useNavigate();
  const { selectedPackId, setSelectedPackId, playerNames } = useSessionStore();
  const { setSession, setPack } = useGameStore();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [paywallPack, setPaywallPack] = useState(null);

  useEffect(() => {
    api.get('/packs').then(({ data }) => {
      setPacks(data.packs);
      setLoading(false);
    });
  }, []);

  const handlePackClick = (pack) => {
    if (pack.isPremium) {
      setPaywallPack(pack);
      return;
    }
    setSelectedPackId(pack._id);
  };

  const handleStart = async () => {
    if (!selectedPackId) return;
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
        players: playerNames.map((name) => ({ name, score: 0 })),
        currentPlayerIndex: 0,
        pack: pack._id,
      };
      setSession(session);
      setPack(pack);
      navigate('/game');
    } catch (err) {
      console.error(err);
      setStarting(false);
    }
  };

  return (
    <Layout className="packs-page">
      <div className="packs-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Retour</button>
        <h1 className="packs-title">Choix du Pack</h1>
        <p className="packs-subtitle">Quel ambiance on se fait ?</p>
      </div>

      {loading ? (
        <div className="packs-loading">Chargement des packs...</div>
      ) : (
        <div className="packs-grid">
          {packs.map((pack, i) => (
            <motion.div
              key={pack._id}
              className={`pack-card ${selectedPackId === pack._id ? 'pack-card--selected' : ''} ${pack.isPremium ? 'pack-card--premium' : ''}`}
              onClick={() => handlePackClick(pack)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="pack-icon"><Icon name={THEME_ICONS[pack.theme] || 'wheel'} size={24} /></span>
              <div className="pack-info">
                <span className="pack-name">{pack.name}</span>
                <span className="pack-desc">{pack.description}</span>
              </div>
              {pack.isPremium ? (
                <span className="pack-premium-badge"><Icon name="lock" size={16} /></span>
              ) : selectedPackId === pack._id ? (
                <span className="pack-check"><Icon name="check" size={16} /></span>
              ) : null}
            </motion.div>
          ))}
        </div>
      )}

      <button
        className="btn btn-gold"
        style={{ width: '100%', marginTop: 'auto', padding: '18px', fontSize: '1.1rem' }}
        onClick={handleStart}
        disabled={!selectedPackId || starting}
      >
        {starting ? 'Préparation...' : 'Lancer la Roulade !'}
      </button>

      <PaywallModal pack={paywallPack} onClose={() => setPaywallPack(null)} />
    </Layout>
  );
}
