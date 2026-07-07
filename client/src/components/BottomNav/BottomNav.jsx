import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../Icon/Icon';
import useAuthStore from '../../store/authStore';
import useAuthModalStore from '../../store/authModalStore';
import './BottomNav.css';

// Onglets de navigation principale. `protected` → ouvre la modale de connexion si pas loggé.
const TABS = [
  { to: '/', label: 'Jouer', icon: 'wheel' },
  // Salons : connecté → ses salons ; anonyme → page de jointure publique (code/QR).
  { to: '/salons', anonTo: '/salon/join', label: 'Salons', icon: 'anchor' },
  { to: '/packs', label: 'Packs', icon: 'trophy' },
  { to: '/passeportmarseillais', label: 'Passeport', icon: 'medal-gold' },
  { to: '/profile', label: 'Profil', icon: 'wave', protected: true },
];

// La barre ne s'affiche QUE sur les écrans racine (pas pendant une partie, un salon, etc.).
const SHOW_ON = ['/', '/packs', '/salons', '/passeportmarseillais', '/profile'];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const openAuthModal = useAuthModalStore((s) => s.open);

  // Visible sur les écrans racine + la page de jointure publique (destination de
  // l'onglet Salons pour les anonymes) → pas de "Retour", on navigue par les onglets.
  const visible = SHOW_ON.includes(location.pathname) || location.pathname.startsWith('/salon/join');

  // Toggle une classe sur body → les pages réservent l'espace du bas via global.css.
  useEffect(() => {
    document.body.classList.toggle('has-bottomnav', visible);
    return () => document.body.classList.remove('has-bottomnav');
  }, [visible]);

  if (!visible) return null;

  const isActive = (tab) => {
    if (tab.to === '/') return location.pathname === '/';
    if (location.pathname.startsWith(tab.to)) return true;
    return !!tab.anonTo && location.pathname.startsWith(tab.anonTo);
  };

  const go = (tab) => {
    if (tab.protected && !user) {
      openAuthModal('login', { redirectTo: tab.to });
      return;
    }
    const target = (!user && tab.anonTo) ? tab.anonTo : tab.to;
    if (location.pathname !== target) navigate(target);
  };

  return (
    <nav className="bottomnav" aria-label="Navigation principale">
      {TABS.map((tab) => {
        const active = isActive(tab);
        return (
          <button
            key={tab.to}
            type="button"
            className={`bottomnav-tab ${active ? 'is-active' : ''}`}
            onClick={() => go(tab)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottomnav-icon"><Icon name={tab.icon} size={24} /></span>
            <span className="bottomnav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
