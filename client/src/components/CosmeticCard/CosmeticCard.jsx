import { motion } from 'framer-motion';
import Icon from '../Icon/Icon';
import RoulettePreview from '../RoulettePreview/RoulettePreview';
import { STORE_BUILD } from '../../utils/permissions';
import './CosmeticCard.css';

export function formatPrice(cents) {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export default function CosmeticCard({
  cosmetic,
  layout = 'vertical',
  // Buy mode (provide both)
  onBuy,
  buying = false,
  // Owned mode (provide both)
  onActivate,
  active = false,
  activating = false,
  // Visual extras
  categoryLabel,
  // Framer Motion animation index (for staggered grid entry)
  index = 0,
}) {
  if (!cosmetic) return null;

  const previewSize = layout === 'vertical' ? 130 : 80;
  const showPreview = cosmetic.category === 'roulette' && cosmetic.asset?.metals;

  const stateClass = active
    ? 'cosmetic-card--active'
    : cosmetic.owned
      ? 'cosmetic-card--owned'
      : '';

  const renderAction = () => {
    if (onActivate) {
      return (
        <button
          className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onActivate(cosmetic)}
          disabled={activating}
        >
          {activating ? '...' : active ? '✓ Actif' : 'Activer'}
        </button>
      );
    }
    if (cosmetic.owned) {
      return (
        <span className="cosmetic-card-owned-badge">
          <Icon name="check" size={14} /> Possédé
        </span>
      );
    }
    if (onBuy && !STORE_BUILD) {
      return (
        <button
          className="btn btn-gold btn-sm cosmetic-card-buy"
          onClick={() => onBuy(cosmetic)}
          disabled={buying}
        >
          {buying ? '...' : `Acheter ${formatPrice(cosmetic.priceCents)}`}
        </button>
      );
    }
    return null;
  };

  return (
    <motion.div
      className={`cosmetic-card cosmetic-card--${layout} ${stateClass}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
    >
      {showPreview && (
        <div className="cosmetic-card-preview">
          <RoulettePreview palette={cosmetic.asset.metals} size={previewSize} />
        </div>
      )}

      <div className="cosmetic-card-info">
        {categoryLabel && <span className="cosmetic-card-cat">{categoryLabel}</span>}
        <span className="cosmetic-card-name">{cosmetic.name}</span>
        {layout === 'vertical' && cosmetic.description && (
          <p className="cosmetic-card-desc">{cosmetic.description}</p>
        )}
        {layout === 'vertical' && !cosmetic.owned && !onActivate && !STORE_BUILD && (
          <span className="cosmetic-card-price">{formatPrice(cosmetic.priceCents)}</span>
        )}
      </div>

      {renderAction()}
    </motion.div>
  );
}
