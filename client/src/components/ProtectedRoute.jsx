import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useAuthModalStore from '../store/authModalStore';

export default function ProtectedRoute({ children, gateOnly = false }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const openAuthModal = useAuthModalStore((s) => s.open);

  // Pas connecté : on renvoie à l'accueil ET on ouvre la modale de connexion,
  // en mémorisant la page demandée pour y revenir après login réussi.
  useEffect(() => {
    if (!user) openAuthModal('login', { redirectTo: location.pathname });
  }, [user, location.pathname, openAuthModal]);

  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (gateOnly && user.role !== 'gate') {
    return <Navigate to="/" replace />;
  }
  return children;
}
