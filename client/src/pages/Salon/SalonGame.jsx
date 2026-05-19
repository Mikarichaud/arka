import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../../components/Layout/Layout';
import Roulette from '../../components/Roulette/Roulette';
import ChallengeCard from '../../components/ChallengeCard/ChallengeCard';
import PastisTimer from '../../components/PastisTimer/PastisTimer';
import PlayerCard from '../../components/PlayerCard/PlayerCard';
import Icon from '../../components/Icon/Icon';
import useSalonStore from '../../store/salonStore';
import useAuthStore from '../../store/authStore';
import { useActiveSkin } from '../../hooks/useActiveSkin';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import { useSound } from '../../hooks/useSound';
import { clearSalonCreds } from '../../services/salonStorage';
import { fumigenesSoft } from '../../styles/motion';
import './Salon.css';
import './SalonGame.css';

const TIMER_DURATION = { 1: 45, 2: 30, 3: 20 };

export default function SalonGame({ emit, code }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const salon = useSalonStore((s) => s.salon);
  const myPlayerId = useSalonStore((s) => s.myPlayerId);
  const onlinePlayerIds = useSalonStore((s) => s.onlinePlayerIds);
  const socketConnected = useSalonStore((s) => s.socketConnected);
  const spinPayload = useSalonStore((s) => s.spinPayload);
  const lastResult = useSalonStore((s) => s.lastResult);
  const voteProgress = useSalonStore((s) => s.voteProgress);
  const emojiBurst = useSalonStore((s) => s.emojiBurst);
  const setEmojiBurst = useSalonStore((s) => s.setEmojiBurst);

  const rouletteSkin = useActiveSkin('roulette');
  const roulettePalette = rouletteSkin?.asset?.metals;
  const { play } = useSound();

  const [localSpinning, setLocalSpinning] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [myVote, setMyVote] = useState(null);          // 'completed' | 'refused' | null
  const [emojiQueue, setEmojiQueue] = useState([]);    // burst à l'écran
  const [emojiOpen, setEmojiOpen] = useState(false);   // popover réactions
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [copied, setCopied] = useState(false);
  const spinTimerRef = useRef(null);
  const emojiCloseTimerRef = useRef(null);

  useEscapeClose(confirmDestroy, () => setConfirmDestroy(false));

  const game = salon?.currentGame || {};
  const pack = game?.pack;
  const phase = game?.phase || 'idle';
  const currentPlayerIndex = game?.currentPlayerIndex ?? 0;
  const currentPlayer = salon?.players?.[currentPlayerIndex];
  const me = salon?.players?.find((p) => p.playerId === myPlayerId);
  const isMe = currentPlayer?.playerId === myPlayerId;
  const isHost = !!me?.isHost;
  const sortedPlayers = useMemo(
    () => [...(salon?.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0)),
    [salon?.players],
  );

  // ── Spin synchronisé multi-device : on attend `startAt` puis on lance l'anim ──
  // Bonus : on vibre 50ms simultanément sur tous les phones connectés. Vraie sensation
  // de "carreau" partagé physiquement.
  useEffect(() => {
    if (!spinPayload) {
      setLocalSpinning(false);
      return undefined;
    }
    const delay = Math.max(0, spinPayload.startAt - Date.now());
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    spinTimerRef.current = setTimeout(() => {
      setLocalSpinning(true);
      if (navigator.vibrate) navigator.vibrate(60);
      play('spin');
    }, delay);
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, [spinPayload?.startAt, spinPayload?.seed]);

  // Quand le serveur transitionne en 'challenge', on coupe l'animation
  // et on joue le son d'arrêt synchro pour tout le monde.
  useEffect(() => {
    if (phase === 'challenge' || phase === 'result' || phase === 'vote') {
      setLocalSpinning(false);
    }
    if (phase === 'challenge') play('stop');
  }, [phase, play]);

  // Son de résultat (validation ou refus) — joué sur tous les phones
  useEffect(() => {
    if (!lastResult) return;
    if (lastResult.result === 'completed') play('validate');
    else if (lastResult.result === 'refused') play('refuse');
  }, [lastResult?.result, lastResult?.activePlayerIndex, play]);

  // Timer démarre quand on entre en 'challenge'
  useEffect(() => {
    if (phase === 'challenge') setTimerRunning(true);
    else setTimerRunning(false);
  }, [phase]);

  // Reset mon vote quand un nouveau tour démarre
  useEffect(() => {
    if (phase !== 'vote') setMyVote(null);
  }, [phase]);

  // Vibration : quand c'est à moi de jouer et qu'on entre en idle (début de tour),
  // un petit buzz pour réveiller le phone. Aussi quand on entre en 'challenge' si c'est moi.
  useEffect(() => {
    if (!navigator.vibrate) return;
    if (!isMe) return;
    if (phase === 'idle') navigator.vibrate(200);
    if (phase === 'challenge') navigator.vibrate([80, 60, 80]);
  }, [phase, isMe]);

  // Affichage emojis : pop queue de 2.5s.
  // Pas de cleanup sur le timer : un nouveau burst ne doit pas annuler le précédent
  // (sinon les emojis bloquent à l'écran si plusieurs arrivent en rafale).
  useEffect(() => {
    if (!emojiBurst) return;
    const e = emojiBurst;
    setEmojiQueue((q) => [...q, e]);
    setEmojiBurst(null);
    setTimeout(() => {
      setEmojiQueue((q) => q.filter((x) => x.id !== e.id));
    }, 2500);
  }, [emojiBurst, setEmojiBurst]);

  if (!salon || !pack) return null;

  const timerDuration = TIMER_DURATION[game?.currentChallenge?.intensity?.level] || 30;
  const isEndGameScreen = salon.status === 'between-games';
  // Le current player est-il offline ? Si oui, le host doit pouvoir sauter le tour
  // (sinon le jeu se bloque en attendant un spin/vote qui ne viendra jamais).
  const currentOffline = !!currentPlayer && !onlinePlayerIds.includes(currentPlayer.playerId);
  const canSkipCurrent = isHost && currentOffline && !isEndGameScreen
    && ['idle', 'spinning', 'challenge', 'vote'].includes(phase);

  // ── Actions courantes ─────────────────────────────────
  const handleSpin = async () => {
    if (!isMe) return;
    await emit('game:spin');
  };
  const handleRelance = async () => {
    if (!isMe) return;
    setTimerRunning(false);
    await emit('game:relance');
  };
  const handleDeclare = async (result) => {
    if (!isMe) return;
    setTimerRunning(false);
    await emit('game:declareResult', { result });
  };
  const handleVote = async (vote) => {
    if (isMe) return;
    setMyVote(vote);
    await emit('game:vote', { vote });
  };
  const handleNext = async () => emit('game:nextTurn');
  const handleEndGame = async () => emit('game:endGame');
  const handleNewRound = async () => emit('game:newRound');
  const handleSkipCurrent = async () => emit('game:skipCurrent');

  // Quitter le salon = simple sortie. Le salon survit, les creds restent en localStorage,
  // l'user peut le retrouver via Mes salons. Même comportement pour host et non-host.
  //
  // Stratégie pour la pile d'historique :
  // - Si une destination explicite est passée et n'est pas /salons (ex: Partie locale → /session/setup),
  //   on push normalement (replace pour ne pas laisser /salon/CODE dans l'historique).
  // - Sinon (Quitter classique) : navigate(-1) pour POPER /salon/CODE proprement → pas d'empilement.
  //   Ça évite le bug "appuyer 5 fois sur retour" qui apparaissait quand chaque cycle Reprendre/Quitter
  //   accumulait des entries /salons via replace successifs.
  // - Fallback : navigate('/salons') si aucun historique (cas direct URL).
  const handleLeave = async (path) => {
    try { await emit('salon:leave', undefined, { silent: true }); } catch { /* noop */ }
    const isExplicitForward = !!path && path !== '/' && path !== '/salons';
    if (isExplicitForward) {
      navigate(path, { replace: true });
      return;
    }
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate(user ? '/salons' : '/', { replace: true, state: { dir: 'back' } });
  };

  // Destruction explicite — host only. Toujours connecté (host est forcément Premium logged).
  const handleDestroy = async () => {
    setConfirmDestroy(false);
    try { await emit('salon:destroy', undefined, { silent: true }); } catch { /* noop */ }
    clearSalonCreds(code);
    navigate('/salons', { replace: true, state: { dir: 'back' } });
  };

  // Invite (réutilisable entre lobby et endgame pour ajouter des joueurs)
  const shareUrl = salon?.shareLink ? `${window.location.origin}/salon/join/${salon.shareLink}` : '';
  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };
  const handleShareLink = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: salon?.name || 'Salon ARKA',
          text: `Rejoins-moi sur ${salon?.name} — code ${code}`,
          url: shareUrl,
        });
      } catch { /* annulé */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch { /* noop */ }
    }
  };

  const handleEmoji = async (emoji) => {
    // Optimistic local burst
    setEmojiBurst({ id: Date.now() + Math.random(), emoji, fromPlayerId: myPlayerId });
    // Auto-collapse 1.5s après le dernier tap pour libérer la zone CTA
    if (emojiCloseTimerRef.current) clearTimeout(emojiCloseTimerRef.current);
    emojiCloseTimerRef.current = setTimeout(() => setEmojiOpen(false), 1500);
    await emit('chat:emoji', { emoji });
  };

  return (
    <Layout className={`game-page salon-game-page ${isEndGameScreen ? 'salon-game-page--endgame' : ''}`}>

      {/* Burst emojis live */}
      <div className="salon-emoji-layer" aria-hidden>
        <AnimatePresence>
          {emojiQueue.map((e) => (
            <motion.span
              key={e.id}
              className="salon-emoji-burst"
              initial={{ opacity: 0, y: 30, scale: 0.6 }}
              animate={{ opacity: 1, y: -80, scale: 1.4 }}
              exit={{ opacity: 0, y: -160, scale: 0.8 }}
              transition={{ duration: 2.4, ease: 'easeOut' }}
              style={{ left: `${20 + Math.random() * 60}%` }}
            >
              {e.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Header scores + badge EN DIRECT */}
      <div className="game-scores">
        <div className="game-scores-chips">
          {salon.players.map((p) => (
            <div
              key={p.playerId}
              className={`score-chip ${p.playerId === currentPlayer?.playerId ? 'active' : ''}`}
            >
              <span className="score-name">{p.pseudo}</span>
              <span className="score-pts">{p.score || 0}</span>
            </div>
          ))}
        </div>
        <div className="game-scores-actions">
          <span
            className={`salon-live-badge ${socketConnected ? '' : 'salon-live-badge--off'}`}
            title={socketConnected ? 'Salon en direct' : 'Connexion perdue'}
          >
            <span className="salon-live-badge-dot" />
            <span className="salon-live-badge-text">
              <strong>{onlinePlayerIds.length}</strong>/{salon.players.length}
            </span>
          </span>
        </div>
      </div>

      {/* ─── Écran fin de partie ───────────────────────── */}
      {isEndGameScreen ? (
        <div className="salon-endgame">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="salon-endgame-title"
          >
            La bouillabaisse est servie !
          </motion.h2>
          <div className="salon-endgame-podium">
            {sortedPlayers.map((p, i) => {
              const online = onlinePlayerIds.includes(p.playerId);
              return (
                <div key={p.playerId} className={`salon-endgame-podium-row ${online ? 'is-online' : 'is-offline'}`}>
                  <PlayerCard
                    player={{ name: p.pseudo, score: p.score || 0 }}
                    rank={i + 1}
                  />
                  <span className="salon-endgame-podium-dot" title={online ? 'Debout au comptoir' : 'Parti faire un tour'} />
                </div>
              );
            })}
          </div>

          {/* Bloc invite — pour ajouter d'autres gatés avant le prochain round.
              Masqué si le salon est plein. */}
          {salon.players.length < 10 && shareUrl && (
            <motion.div
              className="lobby-invite salon-endgame-invite"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="salon-endgame-invite-title">Inviter d'autres gatés</h3>
              <div className="lobby-invite-qr">
                <QRCodeSVG
                  value={shareUrl}
                  size={140}
                  fgColor="#0057A8"
                  bgColor="white"
                  level="H"
                />
              </div>
              <div className="lobby-invite-code">
                <span className="lobby-invite-code-label">Code</span>
                <span className="lobby-invite-code-value" onClick={handleCopyCode} title="Cliquer pour copier">
                  {code}
                </span>
              </div>
              <div className="lobby-invite-actions">
                <button className="btn btn-primary btn-sm" onClick={handleCopyCode}>
                  {copied ? '✓ C\'est dans la poche !' : 'Copier le code'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleShareLink}>
                  Filer le lien
                </button>
              </div>
            </motion.div>
          )}

          <div className="salon-endgame-actions">
            {isHost ? (
              <>
                <button className="btn btn-gold" onClick={handleNewRound}>
                  Relancer la machine
                </button>
                <p className="lobby-warn">Tu pourras choisir un autre pack, té.</p>
              </>
            ) : (
              <p className="lobby-warn">
                On attend que {salon.players.find((p) => p.isHost)?.pseudo || 'le host'} relance la machine…
              </p>
            )}

            <div className="salon-endgame-divider"><span>ou bien</span></div>

            <div className="salon-endgame-quick-leave">
              <button
                type="button"
                className="salon-quick-link"
                onClick={() => handleLeave('/session/setup')}
              >
                <Icon name="wheel" size={14} />
                <span>Partie locale</span>
              </button>
              <button
                type="button"
                className="salon-quick-link"
                onClick={() => handleLeave()}
                title={user ? 'Sortir vers Mes salons' : 'Sortir vers l\'accueil'}
              >
                Quitter
              </button>
              {isHost && (
                <button
                  type="button"
                  className="salon-quick-link salon-quick-link--danger"
                  onClick={() => setConfirmDestroy(true)}
                >
                  Détruire
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Zone roulette */}
          <div className="game-roulette-area">
            <motion.div
              className="game-active-player"
              key={currentPlayer?.playerId}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {isMe ? (
                <>
                  <span className="game-turn-label">À toi de jouer,</span>
                  <span className="game-turn-name">{currentPlayer?.pseudo} !</span>
                </>
              ) : (
                <>
                  <span className="game-turn-label">Au tour de</span>
                  <span className="game-turn-name">{currentPlayer?.pseudo}</span>
                </>
              )}
            </motion.div>

            {/* Bannière "Joueur absent" — visible si current player offline.
                Host voit en plus le bouton "Sauter ce tour" pour débloquer. */}
            {currentOffline && (
              <motion.div
                className="salon-offline-banner"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span>
                  <strong>{currentPlayer?.pseudo}</strong> est parti faire un tour, le jeu attend…
                </span>
                {canSkipCurrent && (
                  <button className="btn btn-primary btn-sm" onClick={handleSkipCurrent}>
                    Sauter ce tour
                  </button>
                )}
              </motion.div>
            )}

            <Roulette
              challenges={pack.challenges}
              targetIndex={game.spinResult}
              isSpinning={localSpinning}
              onSpinEnd={() => {}}
              palette={roulettePalette}
            />
          </div>

          {/* Zone contenu droite */}
          <div className="game-content">
            <AnimatePresence mode="wait">

              {phase === 'idle' && (
                <motion.div
                  key="idle"
                  className={`game-idle ${!isMe ? 'game-idle--spectator' : ''}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {isMe ? (
                    <button className="btn btn-gold game-spin-btn" onClick={handleSpin}>
                      TOURNER LA ROULETTE
                    </button>
                  ) : (
                    <p className="salon-spectator">
                      <Icon name="dots" size={20} />
                      <span>{currentPlayer?.pseudo} va tourner la roulette…</span>
                    </p>
                  )}
                </motion.div>
              )}

              {phase === 'spinning' && (
                <motion.div
                  key="spinning"
                  className="game-spinning-panel"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <motion.div
                    className="game-spinning-dots"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    <Icon name="dots" size={40} />
                  </motion.div>
                  <p className="game-spinning-text">Les jeux sont faits, rien ne va plus…</p>
                </motion.div>
              )}

              {phase === 'challenge' && game.currentChallenge && (
                <motion.div
                  key="challenge"
                  className="game-challenge-area"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <ChallengeCard
                    challenge={game.currentChallenge}
                    playerName={currentPlayer?.pseudo}
                    caseNumber={(game.spinResult ?? 0) + 1}
                  />
                  <div className="game-timer-row">
                    <PastisTimer
                      duration={timerDuration}
                      running={timerRunning}
                      onExpire={() => setTimerRunning(false)}
                    />
                    {isMe ? (
                      <div className="salon-actions-stack">
                        <button className="btn btn-primary btn-sm" onClick={() => handleDeclare('completed')}>
                          ✓ J'ai fait
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeclare('refused')}>
                          ✗ Je refuse
                        </button>
                        <button className="btn-excuse" onClick={handleRelance}>
                          "C'est pas ma faute !"
                        </button>
                      </div>
                    ) : (
                      <p className="salon-spectator salon-spectator--column">
                        <span>{currentPlayer?.pseudo} est en train de relever le défi…</span>
                        <small>Tu voteras juste après.</small>
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {phase === 'vote' && (
                <motion.div
                  key="vote"
                  className="salon-vote"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <h3 className="salon-vote-title">Le jury délibère</h3>
                  <p className="salon-vote-sub">
                    {currentPlayer?.pseudo} a-t-il vraiment relevé le défi ?
                  </p>

                  {isMe ? (
                    <p className="salon-spectator salon-spectator--column">
                      <span>En attente du verdict des autres…</span>
                      {voteProgress && (
                        <small>
                          {voteProgress.cast} / {voteProgress.total} ont voté
                        </small>
                      )}
                    </p>
                  ) : myVote ? (
                    <p className="salon-spectator salon-spectator--column">
                      <span>Vote envoyé ! On attend les autres…</span>
                      {voteProgress && (
                        <small>
                          {voteProgress.cast} / {voteProgress.total} ont voté
                        </small>
                      )}
                    </p>
                  ) : (
                    <div className="salon-vote-buttons">
                      <button className="btn btn-primary" onClick={() => handleVote('completed')}>
                        ✓ Validé
                      </button>
                      <button className="btn btn-danger" onClick={() => handleVote('refused')}>
                        ✗ Refusé
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {phase === 'result' && (
                <motion.div
                  key="result"
                  className="game-result"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring' }}
                >
                  {lastResult && lastResult.result === 'completed' && lastResult.points > 0 && (
                    <motion.div
                      className="game-points-flash"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      +{lastResult.points} pt{lastResult.points > 1 ? 's' : ''}
                    </motion.div>
                  )}
                  {lastResult && lastResult.result === 'refused' && (
                    <motion.div
                      className="salon-result-refused"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      Refusé
                    </motion.div>
                  )}

                  <div className="game-result-scores">
                    {sortedPlayers.map((p, i) => (
                      <PlayerCard
                        key={p.playerId}
                        player={{ name: p.pseudo, score: p.score || 0 }}
                        rank={i + 1}
                        isActive={p.playerId === currentPlayer?.playerId}
                      />
                    ))}
                  </div>

                  <div className="game-result-actions">
                    {(isMe || isHost) && (
                      <button className="btn btn-gold" style={{ width: '100%' }} onClick={handleNext}>
                        Tour suivant →
                      </button>
                    )}
                    {isHost && (
                      <button className="btn btn-end-game" style={{ width: '100%' }} onClick={handleEndGame}>
                        Terminer la partie
                      </button>
                    )}
                    {!isMe && !isHost && (
                      <p className="lobby-warn">
                        En attente du host ou de {currentPlayer?.pseudo}…
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Modale confirm host : DÉTRUIRE le salon (action irréversible). */}
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
                Si tu veux juste prendre l'air, clique <strong>Quitter</strong> — tu le retrouves plus tard
                dans <strong>Mes salons</strong>. Casser, c'est fini-fin : le salon ferme pour tout le monde,
                l'historique reste consultable.
              </p>
              <div className="salon-modal-actions">
                <button className="btn btn-ghost" onClick={() => setConfirmDestroy(false)}>
                  Laisse tomber
                </button>
                <button className="btn btn-danger" onClick={handleDestroy}>
                  Casser pour de bon
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Réactions emojis — FAB repliable pour ne pas chevaucher les CTA */}
      <div className="salon-emoji-dock">
        <AnimatePresence>
          {emojiOpen && (
            <motion.div
              key="popover"
              className="salon-emoji-popover"
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {['🔥', '🦑', '⚽', '👏', '😂', '💀'].map((e) => (
                <button
                  key={e}
                  type="button"
                  className="salon-emoji-btn"
                  onClick={() => handleEmoji(e)}
                  aria-label={`Réaction ${e}`}
                >
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          className={`salon-emoji-fab ${emojiOpen ? 'is-open' : ''}`}
          onClick={() => setEmojiOpen((o) => !o)}
          aria-label="Réactions"
        >
          {emojiOpen ? '✕' : '🐟'}
        </button>
      </div>
    </Layout>
  );
}
