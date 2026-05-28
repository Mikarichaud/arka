import Icon from '../Icon/Icon';
import { getProvenance, PIRATE_PROVENANCE } from '../../utils/provenance';
import './ProvenanceBadge.css';

// Badge de provenance basé sur le code postal.
// - postalCode valide → badge de zone (marseille / paris / nord / pays)
// - pirate=true (joueur anonyme en salon) → badge pirate
// - sinon → rien
// variant: 'full' (icône + label) | 'icon' (icône seule, pour les listes compactes)
export default function ProvenanceBadge({ postalCode, pirate = false, variant = 'full', size = 16 }) {
  const prov = pirate ? PIRATE_PROVENANCE : getProvenance(postalCode);
  if (!prov) return null;

  if (variant === 'icon') {
    return (
      <span className={`prov-badge prov-badge--icon prov-badge--${prov.zone}`} title={`${prov.label} — ${prov.title}`}>
        <Icon name={prov.iconName} size={size} />
      </span>
    );
  }

  return (
    <span className={`prov-badge prov-badge--${prov.zone}`} title={prov.title}>
      <Icon name={prov.iconName} size={size} />
      <span className="prov-badge-label">{prov.label}</span>
    </span>
  );
}
