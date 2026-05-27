import { motion, AnimatePresence } from 'framer-motion';
import useSalonStore from '../../store/salonStore';
import { useEscapeClose } from '../../hooks/useEscapeClose';

// Overlay plein écran déclenché par tap sur un toast média ou un thumbnail historique.
// State centralisé dans salonStore.mediaLightbox.
export default function SalonMediaLightbox() {
  const lightbox = useSalonStore((s) => s.mediaLightbox);
  const setLightbox = useSalonStore((s) => s.setMediaLightbox);
  useEscapeClose(Boolean(lightbox), () => setLightbox(null));

  return (
    <AnimatePresence>
      {lightbox && (
        <motion.div
          className="salon-media-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="salon-media-lightbox-close"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            aria-label="Fermer"
          >
            ×
          </button>
          <div className="salon-media-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {lightbox.resourceType === 'video' ? (
              <video src={lightbox.url} controls autoPlay playsInline />
            ) : (
              <img src={lightbox.url} alt="" />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
