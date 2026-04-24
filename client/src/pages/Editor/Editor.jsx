import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../../components/Layout/Layout';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import './Editor.css';

const INTENSITIES = [
  { level: 1, label: 'Facile', color: '#2DC653' },
  { level: 2, label: 'Moyen', color: '#C9A84C' },
  { level: 3, label: 'Hard',  color: '#E63946' },
];

const emptyChallenge = () => ({ text: '', intensity: INTENSITIES[0] });

export default function Editor() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [packName, setPackName] = useState('');
  const [challenges, setChallenges] = useState(Array.from({ length: 8 }, emptyChallenge));
  const [saving, setSaving] = useState(false);
  const [savedPack, setSavedPack] = useState(null);
  const [error, setError] = useState('');

  const updateChallenge = (i, field, value) => {
    setChallenges((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const setIntensity = (i, intensity) => {
    setChallenges((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], intensity };
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) { navigate('/login'); return; }
    if (!packName.trim()) { setError('Donne un nom à ton pack, té !'); return; }
    const empty = challenges.filter((c) => !c.text.trim());
    if (empty.length > 0) { setError(`Il manque ${empty.length} défi(s) à remplir !`); return; }

    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/packs', {
        name: packName.trim(),
        theme: 'custom',
        isPublic: false,
        challenges: challenges.map((c) => ({
          text: c.text.trim(),
          intensity: c.intensity,
        })),
      });
      setSavedPack(data.pack);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = savedPack
    ? `${window.location.origin}/packs/import/${savedPack.shareCode}`
    : '';

  if (savedPack) {
    return (
      <Layout className="editor-page">
        <motion.div
          className="editor-success card"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring' }}
        >
          <h2 className="editor-success-title">Pack sauvegardé !</h2>
          <p className="editor-success-name">"{savedPack.name}"</p>
          <p className="editor-share-label">Partage ce QR code avec tes amis :</p>

          <div className="editor-qr">
            <QRCodeSVG
              value={shareUrl}
              size={200}
              fgColor="#0057A8"
              bgColor="white"
              level="H"
            />
          </div>

          <div className="editor-share-link">
            <span className="editor-share-code">Code : {savedPack.shareCode}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            >
              Copier le lien
            </button>
          </div>

          <div className="editor-success-actions">
            <button className="btn btn-gold" onClick={() => navigate('/session/setup')}>
              Jouer avec ce pack
            </button>
            <button className="btn btn-ghost" onClick={() => { setSavedPack(null); setPackName(''); setChallenges(Array.from({ length: 8 }, emptyChallenge)); }}>
              Créer un autre pack
            </button>
          </div>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout className="editor-page">
      <div className="editor-header">
        <button className="btn-back" onClick={() => navigate(-1)}>← Retour</button>
        <h1 className="editor-title">Créer un Pack</h1>
        <p className="editor-subtitle">8 défis, ton style, tes règles</p>
      </div>

      <div className="editor-pack-name">
        <input
          className="input"
          type="text"
          placeholder="Nom du pack (ex: Les défis de Mouloud)"
          value={packName}
          onChange={(e) => setPackName(e.target.value)}
          maxLength={40}
        />
      </div>

      <div className="editor-challenges">
        {challenges.map((c, i) => (
          <motion.div
            key={i}
            className="editor-challenge-row card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="editor-challenge-header">
              <span className="editor-case-num" style={{ color: c.intensity.color }}>
                Case {i + 1}
              </span>
              <div className="editor-intensity-picker">
                {INTENSITIES.map((int) => (
                  <button
                    key={int.level}
                    className={`intensity-btn ${c.intensity.level === int.level ? 'active' : ''}`}
                    style={{
                      '--int-color': int.color,
                      borderColor: c.intensity.level === int.level ? int.color : 'transparent',
                      background: c.intensity.level === int.level ? int.color : 'transparent',
                    }}
                    onClick={() => setIntensity(i, int)}
                  >
                    {int.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="input editor-textarea"
              placeholder={`Défi ${i + 1}...`}
              value={c.text}
              onChange={(e) => updateChallenge(i, 'text', e.target.value)}
              rows={2}
              maxLength={200}
            />
            <span className="editor-char-count">{c.text.length}/200</span>
          </motion.div>
        ))}
      </div>

      {error && <p className="editor-error">{error}</p>}

      <button
        className="btn btn-gold"
        style={{ width: '100%', padding: '18px', fontSize: '1.1rem', marginTop: 'auto' }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Sauvegarde...' : 'Sauvegarder le pack'}
      </button>
    </Layout>
  );
}
