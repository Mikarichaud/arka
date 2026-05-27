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

const MEDIA_PHRASES = [
  'X a immortalisé ce moment 📸',
  'X garde un souvenir, hé bé !',
  'X a dégainé l\'appareil photo.',
  'X capture la scène pour la postérité.',
  'X immortalise ça, on va se régaler.',
];

function pickMediaPhrase(pseudo, seed) {
  const idx = Math.abs(hashString(seed || pseudo)) % MEDIA_PHRASES.length;
  return MEDIA_PHRASES[idx].replace('X', pseudo);
}

export default function SalonToast() {
  const joinToast = useSalonStore((s) => s.recentJoinToast);
  const setRecentJoinToast = useSalonStore((s) => s.setRecentJoinToast);
  const errorToast = useSalonStore((s) => s.errorToast);
  const clearErrorToast = useSalonStore((s) => s.clearErrorToast);
  const mediaToast = useSalonStore((s) => s.mediaToast);
  const clearMediaToast = useSalonStore((s) => s.clearMediaToast);
  const setMediaLightbox = useSalonStore((s) => s.setMediaLightbox);

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

  useEffect(() => {
    if (!mediaToast) return undefined;
    const t = setTimeout(() => clearMediaToast(), 3500);
    return () => clearTimeout(t);
  }, [mediaToast?.id, clearMediaToast]);

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
        {mediaToast && (
          <motion.div
            key={`media-${mediaToast.id}`}
            className="salon-toast salon-toast--media"
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={() => {
              setMediaLightbox({ url: mediaToast.url, resourceType: mediaToast.resourceType });
              clearMediaToast();
            }}
            role="button"
            title="Voir en grand"
          >
            <div className="salon-toast-media-thumb">
              {mediaToast.resourceType === 'video' ? (
                <video src={mediaToast.url} muted playsInline />
              ) : (
                <img src={mediaToast.url} alt="" />
              )}
            </div>
            <span className="salon-toast-text">{pickMediaPhrase(mediaToast.pseudo, mediaToast.id)}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
