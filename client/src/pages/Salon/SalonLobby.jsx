import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../../components/Layout/Layout';
import Icon from '../../components/Icon/Icon';
import useSalonStore from '../../store/salonStore';
import { loadSalonCreds, clearSalonCreds } from '../../services/salonStorage';
import { useSalonSocket } from '../../hooks/useSalonSocket';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { saveSalonCreds } from '../../services/salonStorage';
import SalonGame from './SalonGame';
import SalonToast from './SalonToast';
import SalonMediaLightbox from './SalonMediaLightbox';
import './Salon.css';

function ackMessageFromCode(code) {
  switch (code) {
    case 'PACK_NOT_FOUND': return 'Ce pack a disparu, hé bé.';
    case 'PACK_FORBIDDEN': return 'Ce pack, tu y as pas droit, té.';
    case 'PACK_INCOMPLETE': return 'Ce pack est trop maigrelet, manque des défis.';
    case 'NEED_TWO_PLAYERS': return 'Il faut au moins 2 gatés pour démarrer !';
    default: return 'On peut pas lancer la roulade, oh fada.';
  }
}

export default function SalonLobby() {
  const { code: rawCode } = useParams();
  const code = rawCode?.toUpperCase();
  const navigate = useNavigate();
  const location = useLocation();

  const salon = useSalonStore((s) => s.salon);
  const onlinePlayerIds = useSalonStore((s) => s.onlinePlayerIds);
  const socketConnected = useSalonStore((s) => s.socketConnected);
  const socketError = useSalonStore((s) => s.socketError);
  const resetSalon = useSalonStore((s) => s.reset);
  const setMyPlayerId = useSalonStore((s) => s.setMyPlayerId);

  const { user } = useAuthStore();
  const [creds, setCreds] = useState(() => loadSalonCreds(code));
  const [resuming, setResuming] = useState(false);
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pack picker (host)
  const [showPackPicker, setShowPackPicker] = useState(false);
  const [packs, setPacks] = useState([]);
  const [packsLoading, setPacksLoading] = useState(false);
  const [picking, setPicking] = useState(null);
  const [pickError, setPickError] = useState('');

  const { emit } = useSalonSocket(code, creds?.connectionToken);

  // Sync myPlayerId dans le store pour SalonGame
  useEffect(() => {
    if (creds?.playerId) setMyPlayerId(creds.playerId);
  }, [creds?.playerId, setMyPlayerId]);

  // Pas de creds locales : si l'user est connecté et membre, on tente un "resume" serveur
  // qui retourne ses creds. Sinon (anonyme ou non-membre), on renvoie vers /salon/join.
  useEffect(() => {
    if (creds || resuming || !code) return;
    if (!user) {
      navigate('/salon/join', { state: { code } });
      return;
    }
    setResuming(true);
    api.post(`/salons/${code}/resume`)
      .then(({ data }) => {
        const next = { playerId: data.playerId, connectionToken: data.connectionToken, pseudo: data.pseudo };
        saveSalonCreds(code, next);
        setCreds(next);
      })
      .catch((err) => {
        if (err.response?.data?.code === 'SALON_ENDED') {
          // Salon fermé : on redirige vers l'historique
          navigate(`/salon/${code}/history`, { replace: true });
        } else {
          navigate('/salon/join', { state: { code } });
        }
      })
      .finally(() => setResuming(false));
  }, [creds, resuming, code, user, navigate]);

  // Reset du store quand on change de salon ou qu'on quitte
  useEffect(() => {
    return () => resetSalon();
  }, [code, resetSalon]);

  const me = useMemo(() => {
    if (!salon || !creds) return null;
    return salon.players.find((p) => p.playerId === creds.playerId) || null;
  }, [salon, creds]);

  const isHost = !!me?.isHost;
  const isEnded = salon?.status === 'ended';
  const shareUrl = salon?.shareLink ? `${window.location.origin}/salon/join/${salon.shareLink}` : '';

  useEscapeClose(confirmDestroy, () => setConfirmDestroy(false));
  useEscapeClose(showPackPicker && !picking, () => setShowPackPicker(false));

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard refusé : on ignore */ }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: salon?.name || 'Salon ARKA',
          text: `Rejoins-moi sur ${salon?.name} — code ${code}`,
          url: shareUrl,
        });
      } catch { /* share annulé */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch { /* noop */ }
    }
  };

  // Quitter le salon = simple sortie. Le salon survit (persistance des groupes),
  // les creds restent en localStorage pour pouvoir revenir via Mes salons.
  // Préférer navigate(-1) pour POPER l'entrée /salon/CODE proprement et éviter
  // l'accumulation d'entries /salons dans l'historique (qui forçait à cliquer
  // plusieurs fois sur "← Retour" pour revenir à Home).
  const performLeave = async () => {
    try { await emit('salon:leave', undefined, { silent: true }); } catch { /* noop */ }
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate(user ? '/salons' : '/', { replace: true, state: { dir: 'back' } });
  };

  // Destruction explicite — host only (forcément Premium logged-in).
  const performDestroy = async () => {
    setConfirmDestroy(false);
    try { await emit('salon:destroy', undefined, { silent: true }); } catch { /* noop */ }
    clearSalonCreds(code);
    setCreds(null);
    navigate('/salons', { replace: true, state: { dir: 'back' } });
  };

  const openPackPicker = async () => {
    setShowPackPicker(true);
    setPickError('');
    if (packs.length === 0) {
      setPacksLoading(true);
      try {
        const { data } = await api.get('/packs');
        setPacks(data.packs || []);
      } catch {
        setPickError('On arrive pas à choper les packs, hé bé.');
      } finally {
        setPacksLoading(false);
      }
    }
  };

  const handlePickPack = async (packId) => {
    setPicking(packId);
    setPickError('');
    // silent: l'erreur est affichée inline dans la modale, pas besoin du toast global.
    const ack = await emit('game:pickPack', { packId }, { silent: true });
    if (!ack?.ok) {
      setPickError(ack?.message || ackMessageFromCode(ack?.code));
      setPicking(null);
      return;
    }
    setShowPackPicker(false);
    setPicking(null);
  };

  if (!creds) return null;

  // Quand la partie démarre, on bascule sur le composant gameplay.
  // Le socket reste celui du lobby (pas de remount), donc l'état est continu.
  // Le SalonToast est rendu à côté pour être visible aussi pendant la partie.
  if (salon && (salon.status === 'playing' || salon.status === 'between-games')) {
    return (
      <>
        <SalonGame emit={emit} code={code} />
        <SalonToast />
        <SalonMediaLightbox />
      </>
    );
  }

  // État de chargement initial (socket pas encore arrivée)
  if (!salon) {
    return (
      <Layout className="salon-page">
        <div className="salon-header">
          <h1 className="salon-title">On t'installe au comptoir…</h1>
          {socketError && (
            <p className="salon-error">
              {socketError === 'NOT_FOUND' && 'Ce salon, il existe pas, hé bé.'}
              {socketError === 'SALON_ENDED' && 'Ce salon est cassé.'}
              {socketError === 'NOT_MEMBER' && 'T\'es pas (ou plus) du coin, té.'}
              {!['NOT_FOUND', 'SALON_ENDED', 'NOT_MEMBER'].includes(socketError) && 'On arrive pas à se connecter, oh fada.'}
            </p>
          )}
          {socketError && (
            <button
              className="btn btn-primary"
              onClick={() => {
                clearSalonCreds(code);
                navigate(user ? '/salons' : '/', { replace: true, state: { dir: 'back' } });
              }}
              style={{ marginTop: 12 }}
            >
              {user ? 'Retour à Mes salons' : 'Retour à l\'accueil'}
            </button>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout className="salon-page">
      <SalonToast />
      <SalonMediaLightbox />
      <div className="lobby-shell">

        {/* Barre status */}
        <div className="lobby-status-bar">
          <span className={`lobby-live ${socketConnected ? '' : 'lobby-live--off'}`}>
            <span className="lobby-live-dot" />
            {socketConnected ? 'En direct' : 'Hors ligne'}
          </span>
          <span className="lobby-count">
            <Icon name="football" size={14} />
            {salon.players.length} / 10
          </span>
        </div>

        <h1 className="lobby-name">{salon.name}</h1>

        {/* Salon mort */}
        {isEnded && (
          <div className="lobby-dead">
            Le salon est cassé, hé bé.
            <small>
              {salon.endedReason === 'host_destroyed' && 'Le host a tout démonté.'}
              {salon.endedReason === 'host_left' && 'Le host a plié bagage.'}
              {!['host_destroyed', 'host_left'].includes(salon.endedReason || '') && 'Trop longtemps sans personne, on a refermé la porte.'}
            </small>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {user && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/salon/${code}/history`, { replace: true })}
                >
                  Voir l'historique
                </button>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  clearSalonCreds(code);
                  navigate(user ? '/salons' : '/', { replace: true, state: { dir: 'back' } });
                }}
              >
                {user ? 'Mes salons' : 'Accueil'}
              </button>
            </div>
          </div>
        )}

        {/* Bloc invitation (caché si salon mort ou partie en cours) */}
        {!isEnded && salon.status === 'lobby' && (
          <motion.div
            className="lobby-invite"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="lobby-invite-qr">
              <QRCodeSVG
                value={shareUrl}
                size={180}
                fgColor="#0057A8"
                bgColor="white"
                level="H"
              />
            </div>
            <div className="lobby-invite-code">
              <span className="lobby-invite-code-label">Code</span>
              <span
                className="lobby-invite-code-value"
                onClick={handleCopyCode}
                title="Cliquer pour copier"
              >
                {code}
              </span>
            </div>
            <div className="lobby-invite-actions">
              <button className="btn btn-primary btn-sm" onClick={handleCopyCode}>
                {copied ? '✓ C\'est dans la poche !' : 'Copier le code'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleShare}>
                Filer le lien
              </button>
            </div>
          </motion.div>
        )}

        {/* Liste joueurs */}
        <div className="lobby-players">
          <h2 className="lobby-players-title">
            Qui est dans le coin ?
            <span className="lobby-count" style={{ fontSize: '0.75rem' }}>
              {onlinePlayerIds.length} debout
            </span>
          </h2>
          <ul className="lobby-players-list">
            <AnimatePresence initial={false}>
              {salon.players.map((p) => {
                const isMe = p.playerId === creds.playerId;
                const isOnline = onlinePlayerIds.includes(p.playerId);
                return (
                  <motion.li
                    key={p.playerId}
                    className={`lobby-player-row ${isMe ? 'lobby-player-row--me' : ''}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span
                      className={`lobby-player-dot ${isOnline ? 'lobby-player-dot--online' : ''}`}
                      title={isOnline ? 'Debout au comptoir' : 'Parti faire un tour'}
                    />
                    <span className="lobby-player-pseudo">{p.pseudo}</span>
                    {p.isHost && (
                      <span className="lobby-player-badge">
                        <Icon name="star" size={11} />
                        Le patron
                      </span>
                    )}
                    {isMe && !p.isHost && (
                      <span className="lobby-player-badge lobby-player-badge--me">Toi-même</span>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        {/* Actions */}
        {!isEnded && (
          <div className="lobby-actions">
            {isHost && salon.status === 'lobby' && (
              <>
                <button
                  className="btn btn-gold"
                  onClick={openPackPicker}
                  disabled={salon.players.length < 2}
                  title={salon.players.length < 2 ? 'Il faut au moins 2 gatés !' : ''}
                >
                  <Icon name="wheel" size={18} style={{ marginRight: 8 }} />
                  Lancer la roulade !
                </button>
                {salon.players.length < 2 && (
                  <p className="lobby-warn">
                    Il faut au moins 2 gatés pour démarrer, sinon hé bé...
                  </p>
                )}
              </>
            )}
            {!isHost && salon.status === 'lobby' && (
              <p className="lobby-warn">
                On attend que {salon.players.find((p) => p.isHost)?.pseudo || 'le patron'} lance la roulade…
              </p>
            )}
            <button className="btn btn-ghost" onClick={performLeave}>
              Quitter
            </button>
            {isHost && (
              <button
                className="btn-quiet-danger-text"
                onClick={() => setConfirmDestroy(true)}
                title="Casser le salon pour de bon"
              >
                Casser le salon
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modale confirm DESTRUCTION (host uniquement, irréversible) */}
      <AnimatePresence>
        {confirmDestroy && (
          <motion.div
            className="salon-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDestroy(false)}
          >
            <motion.div
              className="salon-modal"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="salon-modal-title">Casser ce salon ?</h3>
              <p className="salon-modal-body">
                Si tu veux juste prendre l'air, clique <strong>Quitter</strong> — tu retrouves tout dans
                <strong> Mes salons</strong>. Casser, c'est fini-fin : le salon ferme pour tout le monde,
                l'historique reste consultable mais on n'y joue plus.
              </p>
              <div className="salon-modal-actions">
                <button className="btn btn-ghost" onClick={() => setConfirmDestroy(false)}>
                  Laisse tomber
                </button>
                <button className="btn btn-danger" onClick={performDestroy}>
                  Casser pour de bon
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Pack picker (host) */}
      <AnimatePresence>
        {showPackPicker && (
          <motion.div
            className="salon-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !picking && setShowPackPicker(false)}
          >
            <motion.div
              className="salon-pack-picker"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="salon-modal-title" style={{ color: 'var(--bleu-azur)' }}>
                Quel pack on attaque ?
              </h3>
              {packsLoading && <p className="salon-modal-body">Ça arrive…</p>}
              {pickError && <p className="salon-error">{pickError}</p>}
              {!packsLoading && (
                <ul className="salon-pack-list">
                  {packs.filter((p) => p.accessible).map((p) => (
                    <li key={p._id}>
                      <button
                        type="button"
                        className={`salon-pack-row ${picking === p._id ? 'is-loading' : ''}`}
                        disabled={!!picking}
                        onClick={() => handlePickPack(p._id)}
                      >
                        <div className="salon-pack-row-info">
                          <span className="salon-pack-row-name">{p.name}</span>
                          {p.description && (
                            <span className="salon-pack-row-desc">{p.description}</span>
                          )}
                        </div>
                        {p.isMine && <span className="lobby-player-badge lobby-player-badge--me">À toi</span>}
                        {p.isPremium && !p.isMine && <Icon name="star" size={14} />}
                      </button>
                    </li>
                  ))}
                  {packs.filter((p) => p.accessible).length === 0 && (
                    <li>
                      <p className="salon-modal-body">
                        Pas un seul pack sous la main, hé bé. Passe en Premium ou crée le tien depuis l'éditeur.
                      </p>
                    </li>
                  )}
                </ul>
              )}
              <div className="salon-modal-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowPackPicker(false)}
                  disabled={!!picking}
                >
                  Laisse tomber
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </Layout>
  );
}
