import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon/Icon';
import './PaywallModal.css';

export default function PaywallModal({ pack, onClose }) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {pack && (
        <motion.div
          className="paywall-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="paywall-modal"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="paywall-icon-wrap">
              <Icon name="lock" size={32} />
            </div>

            <h2 className="paywall-title">Pack Premium</h2>
            <p className="paywall-packname">{pack.name}</p>
            <p className="paywall-desc">
              Ce pack est réservé aux membres Premium.
              Débloque tous les packs, les photos de soirée et l'historique de tes parties.
            </p>

            {pack.challenges?.[0] && (
              <div className="paywall-teaser">
                <p className="paywall-teaser-label">Avant-goût :</p>
                <p className="paywall-teaser-text">« {pack.challenges[0].text} »</p>
                <div className="paywall-teaser-blurred">
                  <span /><span /><span />
                  <p className="paywall-teaser-more">+ {(pack.totalChallenges || 8) - 1} autres défis...</p>
                </div>
              </div>
            )}

            <div className="paywall-pricing">
              <div className="paywall-plan">
                <span className="paywall-plan-name">Pack seul</span>
                <span className="paywall-plan-price">€2,99 – €4,99</span>
                <span className="paywall-plan-desc">Achat définitif</span>
              </div>
              <div className="paywall-plan paywall-plan--featured">
                <span className="paywall-plan-badge">Meilleure valeur</span>
                <span className="paywall-plan-name">Premium</span>
                <span className="paywall-plan-price">€4,99<span>/mois</span></span>
                <span className="paywall-plan-desc">Accès illimité à tout</span>
              </div>
            </div>

            <button className="btn btn-gold paywall-cta" onClick={() => navigate('/premium')}>
              Devenir Premium
            </button>
            <button className="paywall-close" onClick={onClose}>Pas maintenant</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
