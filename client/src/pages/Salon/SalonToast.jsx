import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSalonStore from '../../store/salonStore';
import './SalonToast.css';

const PHRASES = [
  'Té, X vient d\'arriver !',
  'X débarque, hé bé !',
  'Voilà X qui pousse la porte.',
  'X est au comptoir !',
  'Tiens, X nous rejoint.',
];

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function pickPhrase(pseudo, seed) {
  const idx = Math.abs(hashString(seed || pseudo)) % PHRASES.length;
  return PHRASES[idx].replace('X', pseudo);
}

export default function SalonToast() {
  const joinToast = useSalonStore((s) => s.recentJoinToast);
  const setRecentJoinToast = useSalonStore((s) => s.setRecentJoinToast);
  const errorToast = useSalonStore((s) => s.errorToast);
  const clearErrorToast = useSalonStore((s) => s.clearErrorToast);

  useEffect(() => {
    if (!joinToast) return undefined;
    const t = setTimeout(() => setRecentJoinToast(null), 3200);
    return () => clearTimeout(t);
  }, [joinToast?.id, joinToast?.ts, setRecentJoinToast]);

  useEffect(() => {
    if (!errorToast) return undefined;
    const t = setTimeout(() => clearErrorToast(), 3800);
    return () => clearTimeout(t);
  }, [errorToast?.ts, clearErrorToast]);

  // Anchor en position fixe (centrage horizontal via transform), motion gère l'animation Y.
  // Le wrapper évite le conflit transform: translateX vs framer-motion y.
  // Les 2 types de toasts (join + error) peuvent s'empiler.
  return (
    <div className="salon-toast-anchor">
      <AnimatePresence>
        {joinToast && (
          <motion.div
            key={`join-${joinToast.id}-${joinToast.ts}`}
            className="salon-toast salon-toast--join"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <span className="salon-toast-wave">👋</span>
            <span className="salon-toast-text">
              {pickPhrase(joinToast.pseudo, joinToast.id)}
            </span>
          </motion.div>
        )}
        {errorToast && (
          <motion.div
            key={`err-${errorToast.ts}`}
            className="salon-toast salon-toast--error"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={clearErrorToast}
            role="button"
            title="Cliquer pour fermer"
          >
            <span className="salon-toast-error-icon">!</span>
            <span className="salon-toast-text">{errorToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
