import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthModalStore from '../../store/authModalStore';

// Les anciennes routes /login et /login/forgot deviennent des modales : on
// renvoie à l'accueil et on ouvre la modale correspondante. Garde les vieux
// liens, bookmarks et les navigate('/login') existants fonctionnels.
export default function AuthRouteRedirect({ mode = 'login' }) {
  const location = useLocation();
  const open = useAuthModalStore((s) => s.open);
  const redirectTo = location.state?.redirectTo || location.state?.redirect || null;

  useEffect(() => {
    open(mode, { redirectTo });
  }, [mode, redirectTo, open]);

  return <Navigate to="/" replace />;
}
