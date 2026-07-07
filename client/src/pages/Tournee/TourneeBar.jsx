import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/Icon/Icon';
import SEO from '../../components/SEO/SEO';
import { useSound } from '../../hooks/useSound';
import useAuthModalStore from '../../store/authModalStore';
import api from '../../services/api';
import TourneeWheel from './TourneeWheel';
import './Tournee.css';

const APP_STORE_URL = import.meta.env.VITE_APP_STORE_URL || 'https://apps.apple.com/fr/app/la-roulade-marseillaise/id6778055823';

const PHRASES = [
  'Pas de fuite, hé bé !',
  'La tournée est pour toi, té.',
  'Allez, sors la carte bleue !',
  'Le sort a parlé, régale.',
];

// Prénoms fantômes : servent de placeholders ET remplissent la roue-aperçu
// tant que la tablée n'a pas tapé ses vrais prénoms.
const GHOST_NAMES = ['Marius', 'Fanny', 'Dédé', 'Nono', 'César', 'Jojo', 'Zizou', 'Titine', 'Riton', 'Loulou'];

// Confettis : icônes SVG vectorisées (pas d'emoji système).
const CONFETTI_ICONS = ['beer', 'party', 'anchor', 'star', 'trophy'];

// L'app n'existe que sur iOS → on n'affiche « Télécharger » que sur iPhone/iPad.
const IS_IOS = typeof navigator !== 'undefined'
  && (/iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const trackEvent = (type) => {
  const spot = localStorage.getItem('tournee_spot');
  if (spot) api.post('/tournee/event', { spot, type }).catch(() => {});
};

export default function TourneeBar() {
  const navigate = useNavigate();
  const { play } = useSound();
  const openAuth = useAuthModalStore((s) => s.open);
  const [params] = useSearchParams();

  const [names, setNames] = useState(['', '']);
  const [phase, setPhase] = useState('setup'); // setup | spinning | result
  const [players, setPlayers] = useState([]);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(-1);
  const [landed, setLanded] = useState(false);
  const [error, setError] = useState('');
  const [phrase, setPhrase] = useState('');

  // Campagne stickers : mémorise le spot scanné + compte le scan (1×/jour/appareil).
  useEffect(() => {
    const spot = params.get('spot');
    if (!spot) return;
    localStorage.setItem('tournee_spot', spot);
    const key = `tournee_scan_${spot}`;
    const today = new Date().toDateString();
    if (localStorage.getItem(key) !== today) {
      localStorage.setItem(key, today);
      api.post('/tournee/event', { spot, type: 'scan' }).catch(() => {});
    }
  }, [params]);

  const setName = (i, v) => setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  const addName = () => setNames((prev) => (prev.length >= 10 ? prev : [...prev, '']));
  const removeName = (i) => setNames((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));

  // Roue-aperçu : chaque ligne de saisie → prénom tapé ou son fantôme, mis à jour en direct.
  const previewNames = names.map((n, i) => n.trim() || GHOST_NAMES[i % GHOST_NAMES.length]);

  const spin = useCallback(() => {
    const valid = names.map((n) => n.trim()).filter(Boolean);
    if (valid.length < 2) { setError('Mets au moins 2 prénoms, té !'); return; }
    setError('');
    setPlayers(valid);
    setLanded(false);
    setPhase('spinning');
    const w = Math.floor(Math.random() * valid.length);
    setWinner(w);
    const ang = 360 / valid.length;
    const base = Math.ceil((rotation || 1) / 360) * 360 + 360 * 5;
    const offset = (360 - (w * ang + ang / 2)) % 360;
    setRotation(base + offset);
    play('spin');
    if (navigator.vibrate) navigator.vibrate(40);
  }, [names, rotation, play]);

  const onRest = () => {
    if (phase !== 'spinning') return;
    setLanded(true);
    setPhase('result');
    setPhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
    play('validate');
    if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
  };

  const replay = () => { setLanded(false); setPhase('setup'); };

  const downloadApp = () => { trackEvent('app'); window.location.href = APP_STORE_URL; };

  // Entrée : passe au champ suivant, ou lance la roulette si on est sur le dernier.
  const onKey = (e, i) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const inputs = e.target.closest('.tournee-names').querySelectorAll('input');
    if (i < inputs.length - 1) inputs[i + 1].focus();
    else spin();
  };

  return (
    <div className="tournee-page">
      <SEO
        title="Qui régale la prochaine tournée ?"
        titleAsIs
        description="Entre les prénoms, lance la roulette marseillaise et découvre qui paie la prochaine tournée. Gratuit, sans inscription. 🍻"
        path="/tournee"
      />

      {phase === 'result' && (
        <div className="tournee-confetti" aria-hidden>
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.span key={i} className="tournee-conf"
              initial={{ y: -40, opacity: 0, rotate: 0 }}
              animate={{ y: '90vh', opacity: [0, 1, 1, 0], rotate: 360 }}
              transition={{ duration: 2.2 + (i % 5) * 0.3, delay: (i % 8) * 0.06, ease: 'easeIn' }}
              style={{ left: `${(i * 6.5) % 100}%` }}
            ><Icon name={CONFETTI_ICONS[i % CONFETTI_ICONS.length]} size={26} /></motion.span>
          ))}
        </div>
      )}

      <div className="tournee-main">
      <header className="tournee-head">
        <span className="tournee-brand">La Roulade Marseillaise</span>
        <h1 className="tournee-title">Qui régale<br />la prochaine tournée ?</h1>
      </header>

      <AnimatePresence mode="wait">
        {phase === 'setup' ? (
          <motion.div key="setup" className="tournee-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <TourneeWheel preview names={previewNames} rotation={0} winner={-1} landed={false} />
            <p className="tournee-lead">Entre les prénoms de la tablée :</p>
            <div className="tournee-names">
              {names.map((n, i) => (
                <div key={i} className="tournee-name-row">
                  <input className="input tournee-input" placeholder={GHOST_NAMES[i % GHOST_NAMES.length]} value={n} maxLength={20}
                    autoFocus={i === 0}
                    onChange={(e) => setName(i, e.target.value)}
                    onKeyDown={(e) => onKey(e, i)} />
                  {names.length > 2 && <button className="tournee-remove" onClick={() => removeName(i)} aria-label="Retirer">✕</button>}
                </div>
              ))}
            </div>
            {names.length < 10 && <button className="btn btn-ghost btn-sm tournee-add" onClick={addName}>+ Ajouter un joueur</button>}
            {error && <p className="tournee-error">{error}</p>}
            <button className="btn btn-gold tournee-spin" onClick={spin}>Lancer la roulette !</button>
            <p className="tournee-reassure"><Icon name="beer" size={16} /> Gratuit, sans inscription</p>
          </motion.div>
        ) : (
          <motion.div key="play" className="tournee-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <TourneeWheel names={players} rotation={rotation} winner={winner} landed={landed} onRest={onRest} />

            {phase === 'result' ? (
              <motion.div className="tournee-result" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
                <p className="tournee-result-line">Té, c'est <strong>{players[winner]}</strong> qui régale ! <Icon name="beer" size={26} className="tournee-inline-ico" /></p>
                <p className="tournee-result-sub">{phrase}</p>
                <button className="btn btn-primary tournee-replay" onClick={replay}>Rejouer</button>

                <div className="tournee-cta">
                  <p className="tournee-cta-title">Le vrai jeu t'attend</p>
                  <p className="tournee-cta-sub">Des centaines de défis marseillais, en soirée ou à distance entre potes.</p>
                  {IS_IOS ? (
                    <>
                      <button className="btn btn-gold tournee-dl" onClick={downloadApp}><Icon name="mobile" size={18} /> Télécharger l'app</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openAuth('register', { redirectTo: '/' })}>Créer un compte gratuit</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-gold" onClick={() => openAuth('register', { redirectTo: '/' })}>Créer un compte gratuit</button>
                      <p className="tournee-cta-note"><Icon name="mobile" size={14} className="tournee-inline-ico" /> L'app est sur iPhone. Sur Android ou ordi, crée ton compte et joue sur le web.</p>
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              <p className="tournee-spinning-msg">La roulade tourne…</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <button className="tournee-foot" onClick={() => navigate('/')}>
        <Icon name="wheel" size={16} /> Découvrir La Roulade Marseillaise
      </button>
    </div>
  );
}
