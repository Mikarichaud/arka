import './LoadingPlaceholder.css';

export default function LoadingPlaceholder({ variant = 'card', count = 3, label = 'Chargement…' }) {
  const items = Array.from({ length: count });
  return (
    <div className="skeleton-wrap" role="status" aria-label={label} aria-busy="true">
      {items.map((_, i) => (
        <div key={i} className={`skeleton skeleton--${variant}`} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
