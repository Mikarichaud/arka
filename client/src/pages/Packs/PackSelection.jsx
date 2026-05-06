import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import PaywallModal from '../../components/PaywallModal/PaywallModal';
import { useCategories } from '../../hooks/useCategories';
import useSessionStore from '../../store/sessionStore';
import useGameStore from '../../store/gameStore';
import api from '../../services/api';
import './PackSelection.css';

export default function PackSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedPackId, setSelectedPackId, playerNames } = useSessionStore();
  const { setSession, setPack } = useGameStore();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
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
      .finally(() => setLoading(false));
  }, []);

  const handlePackClick = (pack) => {
    if (pack.isPremium && !pack.accessible) {
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
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
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
              className={`pack-card ${selectedPackId === pack._id ? 'pack-card--selected' : ''} ${pack.isPremium && !pack.accessible ? 'pack-card--premium' : ''}`}
              onClick={() => handlePackClick(pack)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="pack-icon"><Icon name={catBySlug[pack.theme]?.icon || 'wheel'} size={24} /></span>
              <div className="pack-info">
                <span className="pack-name">{pack.name}</span>
                <span className="pack-desc">{pack.description}</span>
              </div>
              {pack.isPremium && !pack.accessible ? (
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
