import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import useAuthStore from '../../store/authStore';
import { saveSalonCreds, loadSalonCreds } from '../../services/salonStorage';
import api from '../../services/api';
import './Salon.css';

// Code humain : 8 chars du même alphabet que côté serveur (sans 0/O/1/I)
const CODE_ALPHABET = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

export default function SalonJoin() {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const { shareLink } = useParams();
  const { user } = useAuthStore();

  const [code, setCode] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [preview, setPreview] = useState(null);   // { code, name, status, playerCount, ... } via shareLink
  const [loadingPreview, setLoadingPreview] = useState(!!shareLink);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  // Pré-remplir le pseudo avec le username si connecté
  useEffect(() => {
    if (user?.username) setPseudo((p) => p || user.username);
  }, [user]);

  // Si on arrive via shareLink : preview du salon
  useEffect(() => {
    if (!shareLink) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/salons/share/${shareLink}`);
        if (cancelled) return;
        setPreview(data);
        setCode(data.code);
        // Reprise auto si on a déjà des creds pour ce salon — SAUF si on arrive
        // ici via une navigation back (POP). Sinon on piège l'user : il quitte
        // le salon → browser back → SalonJoin → auto-redirect → boucle infinie.
        // Sur POP on affiche le formulaire ; l'user peut cliquer "Entrer" pour
        // revenir explicitement dans le salon (handleJoin a sa propre logique de reprise).
        const existing = loadSalonCreds(data.code);
        if (existing && data.status !== 'ended' && navType !== 'POP') {
          navigate(`/salon/${data.code}`, { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || 'Salon introuvable.');
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shareLink, navigate, navType]);

  const handleJoin = async (e) => {
    e?.preventDefault?.();
    setError('');
    const normalizedCode = code.trim().toUpperCase();
    const normalizedPseudo = pseudo.trim();

    if (!CODE_ALPHABET.test(normalizedCode)) {
      setError('Code invalide : 8 caractères (lettres et chiffres).');
      return;
    }
    if (!normalizedPseudo) {
      setError('Choisis un pseudo.');
      return;
    }

    // Reprise auto si on a déjà rejoint ce salon
    const existing = loadSalonCreds(normalizedCode);
    if (existing) {
      navigate(`/salon/${normalizedCode}`);
      return;
    }

    setJoining(true);
    try {
      const { data } = await api.post(`/salons/${normalizedCode}/join`, {
        pseudo: normalizedPseudo,
      });
      const { salon, playerId, connectionToken } = data;
      saveSalonCreds(salon.code, {
        playerId,
        connectionToken,
        pseudo: normalizedPseudo,
      });
      navigate(`/salon/${salon.code}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de rejoindre le salon.');
      setJoining(false);
    }
  };

  return (
    <Layout className="salon-page">
      <div className="salon-header">
        <button
          className="btn-back"
          onClick={() => (location.key !== 'default' ? navigate(-1) : navigate('/'))}
        >← Retour</button>
        <h1 className="salon-title">Rejoindre un Salon</h1>
        <p className="salon-subtitle">
          {shareLink
            ? "Tu viens d'être invité. Choisis ton pseudo."
            : 'Tape le code à 8 caractères que t\'a filé le host.'}
        </p>
      </div>

      {/* Preview salon via shareLink */}
      {shareLink && (
        loadingPreview ? (
          <div className="salon-preview">
            <p className="salon-subtitle">Chargement…</p>
          </div>
        ) : preview ? (
          <motion.div
            className="salon-preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="salon-preview-name">{preview.name}</h2>
            <div className="salon-preview-meta">
              <span>
                <strong>{preview.playerCount}</strong> / {preview.maxPlayers} joueurs
              </span>
              {preview.status === 'ended' && (
                <span className="salon-status-pill salon-status-pill--ended">Fermé</span>
              )}
              {preview.isFull && preview.status !== 'ended' && (
                <span className="salon-status-pill salon-status-pill--full">Complet</span>
              )}
              {preview.status !== 'ended' && !preview.isFull && (
                <span className="salon-status-pill salon-status-pill--live">En direct</span>
              )}
            </div>
          </motion.div>
        ) : null
      )}

      <motion.form
        className="salon-form"
        onSubmit={handleJoin}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {!shareLink && (
          <>
            <label className="salon-label">Code du salon</label>
            <input
              className="input"
              type="text"
              placeholder="EX : ABCD23JK"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-titre)' }}
            />
          </>
        )}

        <label className="salon-label">Ton pseudo</label>
        <input
          className="input"
          type="text"
          placeholder="Mireille, Mouloud, Toto…"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          maxLength={20}
        />

        {error && <p className="salon-error">{error}</p>}

        <button
          type="submit"
          className="btn btn-gold salon-cta"
          disabled={
            joining
            || !pseudo.trim()
            || (!shareLink && !CODE_ALPHABET.test(code.trim().toUpperCase()))
            || preview?.status === 'ended'
            || preview?.isFull
          }
        >
          {joining ? 'Connexion…' : (
            <>
              <Icon name="wave" size={18} style={{ marginRight: 8 }} />
              Entrer dans le salon
            </>
          )}
        </button>

        {!user && (
          <div className="salon-hint">
            <Icon name="star" size={14} />
            <span>Pas besoin de compte. Tes stats compteront si tu te connectes.</span>
          </div>
        )}
      </motion.form>
    </Layout>
  );
}
