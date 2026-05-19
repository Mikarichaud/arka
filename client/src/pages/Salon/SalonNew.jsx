import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import useAuthStore from '../../store/authStore';
import { saveSalonCreds } from '../../services/salonStorage';
import { hasPremiumAccess } from '../../utils/permissions';
import api from '../../services/api';
import './Salon.css';

export default function SalonNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { redirectTo: '/salon/new' } });
      return;
    }
    if (!hasPremiumAccess(user)) {
      navigate('/premium');
      return;
    }
    setPseudo(user.username || '');
  }, [user, navigate]);

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      const { data } = await api.post('/salons', {
        name: name.trim() || undefined,
        pseudo: pseudo.trim() || undefined,
      });
      const { salon, playerId, connectionToken } = data;
      saveSalonCreds(salon.code, {
        playerId,
        connectionToken,
        pseudo: pseudo.trim() || user.username,
      });
      navigate(`/salon/${salon.code}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Création échouée.');
      setCreating(false);
    }
  };

  if (!user || !hasPremiumAccess(user)) return null;

  return (
    <Layout className="salon-page">
      <div className="salon-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="salon-title">Créer un Salon</h1>
        <p className="salon-subtitle">Invite tes amis sur leur téléphone, on joue en direct.</p>
      </div>

      <motion.div
        className="salon-form"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <label className="salon-label">Nom du salon (optionnel)</label>
        <input
          className="input"
          type="text"
          placeholder="Ex : Soirée Cabanon… (sinon on en tire un au sort)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />

        <label className="salon-label">Ton pseudo dans le salon</label>
        <input
          className="input"
          type="text"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          maxLength={20}
        />

        {error && <p className="salon-error">{error}</p>}

        <button
          className="btn btn-gold salon-cta"
          onClick={handleCreate}
          disabled={creating || !pseudo.trim()}
        >
          {creating ? 'Création…' : (
            <>
              <Icon name="wheel" size={18} style={{ marginRight: 8 }} />
              Ouvrir le salon !
            </>
          )}
        </button>

        <div className="salon-hint">
          <Icon name="star" size={14} />
          <span>10 joueurs max · QR code et code à 8 chiffres pour inviter</span>
        </div>
      </motion.div>
    </Layout>
  );
}
