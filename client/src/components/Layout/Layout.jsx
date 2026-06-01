import './Layout.css';

// La transition entre pages est gérée UNE seule fois dans App.jsx (AnimatePresence).
// Layout est juste le conteneur de page (plus d'animation ici, sinon double couche).
export default function Layout({ children, className = '' }) {
  return <div className={`layout-page ${className}`}>{children}</div>;
}
