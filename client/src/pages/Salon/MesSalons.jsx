import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import LoadingPlaceholder from '../../components/LoadingPlaceholder/LoadingPlaceholder';
import EmptyState from '../../components/EmptyState/EmptyState';
import useAuthStore from '../../store/authStore';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { hasPremiumAccess } from '../../utils/permissions';
import api from '../../services/api';
import './Salon.css';
import './MesSalons.css';

const STATUS_LABEL = {
  lobby: 'À l\'apéro',
  playing: 'Sur le carreau',
  'between-games': 'Pause pastis',
  ended: 'Au cagnard',
};

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function MesSalons() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [destroy, setDestroy] = useState(null);    // salon en cours de destruction
  const [destroying, setDestroying] = useState(false);

  useEscapeClose(Boolean(destroy) && !destroying, () => setDestroy(null));

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { redirectTo: '/salons' } });
      return;
    }
    setLoading(true);
    api.get('/salons/me')
      .then(({ data }) => setSalons(data.salons || []))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger tes salons.'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleDestroy = async () => {
    if (!destroy) return;
    setDestroying(true);
    try {
      await api.delete(`/salons/${destroy.code}`);
      setSalons((arr) => arr.map((s) => (s.code === destroy.code ? { ...s, status: 'ended' } : s)));
      setDestroy(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Destruction échouée.');
    } finally {
      setDestroying(false);
    }
  };

  if (!user) return null;

  const active = salons.filter((s) => s.status !== 'ended');
  const archived = salons.filter((s) => s.status === 'ended');

  return (
    <Layout className="mes-salons-page">
      <div className="salon-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="salon-title">Mes salons</h1>
        <p className="salon-subtitle">
          Tes troquets à toi — chaque salon garde les parties, les photos et les stats. Té, ça reste entre nous.
        </p>
      </div>

      {/* Action bar top : créer (premium) + rejoindre. Toujours visible, qu'il y ait des salons ou non. */}
      <div className="mes-salons-action-bar">
        {hasPremiumAccess(user) ? (
          <button className="btn btn-gold mes-salons-cta" onClick={() => navigate('/salon/new')}>
            <Icon name="wave" size={16} style={{ marginRight: 6 }} />
            Ouvrir un nouveau salon
          </button>
        ) : (
          <button
            className="btn btn-ghost mes-salons-cta mes-salons-cta--upsell"
            onClick={() => navigate('/premium')}
            title="Ouvrir un salon, c'est pour les Premium"
          >
            <Icon name="star" size={16} style={{ marginRight: 6 }} />
            Ouvrir un salon · Premium
          </button>
        )}
        <button className="btn btn-primary mes-salons-cta" onClick={() => navigate('/salon/join')}>
          <Icon name="anchor" size={16} style={{ marginRight: 6 }} />
          Rejoindre avec un code
        </button>
      </div>

      {error && <p className="salon-error">{error}</p>}

      {loading ? (
        <div className="mes-salons-grid">
          <LoadingPlaceholder variant="card" />
          <LoadingPlaceholder variant="card" />
        </div>
      ) : salons.length === 0 ? (
        <EmptyState
          icon="anchor"
          title="Pas un seul salon, hé bé !"
          description="Ouvre le premier ou rejoins celui d'un copain avec son code. Allez, on bouge."
        />
      ) : (
        <>
          {active.length > 0 && (
            <section className="mes-salons-section">
              <h2 className="mes-salons-section-title">Encore chauds</h2>
              <div className="mes-salons-grid">
                {active.map((s) => (
                  <SalonCard
                    key={s.code}
                    salon={s}
                    onResume={() => navigate(`/salon/${s.code}`)}
                    onHistory={() => navigate(`/salon/${s.code}/history`)}
                    onDestroy={() => setDestroy(s)}
                  />
                ))}
              </div>
            </section>
          )}

          {archived.length > 0 && (
            <section className="mes-salons-section">
              <h2 className="mes-salons-section-title">Aux oubliettes</h2>
              <div className="mes-salons-grid">
                {archived.map((s) => (
                  <SalonCard
                    key={s.code}
                    salon={s}
                    onHistory={() => navigate(`/salon/${s.code}/history`)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <AnimatePresence>
        {destroy && (
          <motion.div
            className="salon-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !destroying && setDestroy(null)}
          >
            <motion.div
              className="salon-modal"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="salon-modal-title">Casser « {destroy.name} » ?</h3>
              <p className="salon-modal-body">
                Une fois cassé, c'est cassé, hé. Le salon se ferme pour tout le monde. L'historique reste consultable, mais plus moyen d'y refaire une partie.
              </p>
              <div className="salon-modal-actions">
                <button className="btn btn-ghost" onClick={() => setDestroy(null)} disabled={destroying}>
                  Laisse tomber
                </button>
                <button className="btn btn-danger" onClick={handleDestroy} disabled={destroying}>
                  {destroying ? 'On casse…' : 'Casser pour de bon'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

function SalonCard({ salon, onResume, onHistory, onDestroy }) {
  const isEnded = salon.status === 'ended';
  const isPlaying = salon.status === 'playing';
  return (
    <motion.div
      className={`mes-salon-card ${isEnded ? 'mes-salon-card--ended' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mes-salon-card-head">
        <h3 className="mes-salon-card-name">{salon.name}</h3>
        <span className={`mes-salon-status mes-salon-status--${salon.status}`}>
          {isPlaying && <span className="mes-salon-status-dot" />}
          {STATUS_LABEL[salon.status] || salon.status}
        </span>
      </div>

      <div className="mes-salon-meta">
        <span><Icon name="football" size={12} /> {salon.playerCount} joueurs</span>
        <span><Icon name="trophy" size={12} /> {salon.gameCount} parties</span>
        <span><Icon name="dots" size={12} /> {timeAgo(salon.lastActivityAt)}</span>
        {salon.isHost && <span className="mes-salon-host-pill">Host</span>}
      </div>

      <div className="mes-salon-actions">
        {!isEnded && onResume && (
          <button className="btn btn-gold btn-sm" onClick={onResume}>
            {isPlaying ? 'Y retourner !' : 'Ouvrir le salon'}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onHistory}>
          L'historique
        </button>
        {salon.isHost && !isEnded && (
          <button className="btn-quiet-danger" onClick={onDestroy} title="Casser le salon">
            <Icon name="cross" size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
