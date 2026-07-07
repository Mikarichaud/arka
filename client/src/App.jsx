import { createContext, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { syncStatusBar, hideSplash } from './native';
import BottomNav from './components/BottomNav/BottomNav';
import Home from './pages/Home/Home';
import ResetPassword from './pages/Auth/ResetPassword';
import SessionSetup from './pages/Session/SessionSetup';
import PackLibrary from './pages/Packs/PackLibrary';
import Editor from './pages/Editor/Editor';
import Game from './pages/Game/Game';
import Gallery from './pages/Gallery/Gallery';
import History from './pages/History/History';
import Premium from './pages/Premium/Premium';
import PremiumSuccess from './pages/Premium/PremiumSuccess';
import Profile from './pages/Profile/Profile';
import Privacy from './pages/Legal/Privacy';
import Terms from './pages/Legal/Terms';
import GatePacks from './pages/Gate/GatePacks';
import GateCosmetics from './pages/Gate/GateCosmetics';
import GateQuiz from './pages/Gate/GateQuiz';
import AdminDashboard from './pages/Admin/Dashboard';
import SalonNew from './pages/Salon/SalonNew';
import SalonJoin from './pages/Salon/SalonJoin';
import SalonLobby from './pages/Salon/SalonLobby';
import MesSalons from './pages/Salon/MesSalons';
import SalonHistory from './pages/Salon/SalonHistory';
import PermisHome from './pages/Permis/PermisHome';
import PermisExam from './pages/Permis/PermisExam';
import PermisHistory from './pages/Permis/PermisHistory';
import CertificatePublic from './pages/Permis/CertificatePublic';
import TourneeBar from './pages/Tournee/TourneeBar';
import ProtectedRoute from './components/ProtectedRoute';
import AuthModal from './components/AuthModal/AuthModal';
import AuthRouteRedirect from './components/AuthModal/AuthRouteRedirect';
import { FEATURES_UNLOCKED, STORE_BUILD } from './utils/permissions';

export const NavDirectionContext = createContext(1);
export const useNavDirection = () => useContext(NavDirectionContext);

function AnimatedRoutes() {
  const location = useLocation();
  const navType = useNavigationType();
  // POP / Quitter explicite (state.dir='back') → glissement inverse.
  const dir = (navType === 'POP' || location.state?.dir === 'back') ? -1 : 1;

  // À chaque changement d'écran : on remonte en haut + on resynchronise la status bar.
  useEffect(() => {
    window.scrollTo(0, 0);
    syncStatusBar();
  }, [location.pathname]);

  // App montée → on masque le splash natif (qui restait affiché pendant le chargement web).
  useEffect(() => { hideSplash(); }, []);

  // Transition unique (une seule couche, Layout est statique) : fondu + glissement
  // directionnel. Sortie accélérée pour limiter le temps mort du mode="wait".
  const variants = {
    initial: (d) => ({ opacity: 0, x: d * 36 }),
    animate: { opacity: 1, x: 0 },
    exit: (d) => ({ opacity: 0, x: d * -28, transition: { duration: 0.14, ease: 'easeIn' } }),
  };

  return (
    <NavDirectionContext.Provider value={dir}>
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={location.pathname}
          custom={dir}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'tween', ease: [0.22, 0.61, 0.36, 1], duration: 0.28 }}
          style={{ minHeight: '100dvh' }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<AuthRouteRedirect mode="login" />} />
            <Route path="/login/forgot" element={<AuthRouteRedirect mode="forgot" />} />
            <Route path="/login/reset" element={<ResetPassword />} />
            <Route path="/session/setup" element={<SessionSetup />} />
            <Route path="/session/pack" element={<Navigate to="/session/setup" replace />} />
            <Route path="/packs" element={<PackLibrary />} />
            <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
            <Route path="/editor/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
            <Route path="/game" element={<Game />} />
            <Route path="/gallery/:shareLink" element={<Gallery />} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/premium" element={(FEATURES_UNLOCKED || STORE_BUILD) ? <Navigate to="/" replace /> : <Premium />} />
            <Route path="/premium/success" element={(FEATURES_UNLOCKED || STORE_BUILD) ? <Navigate to="/" replace /> : <PremiumSuccess />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/gate/packs" element={<ProtectedRoute gateOnly><GatePacks /></ProtectedRoute>} />
            <Route path="/gate/cosmetics" element={<ProtectedRoute gateOnly><GateCosmetics /></ProtectedRoute>} />
            <Route path="/gate/quiz" element={<ProtectedRoute gateOnly><GateQuiz /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/salon/new" element={<ProtectedRoute><SalonNew /></ProtectedRoute>} />
            <Route path="/salon/join" element={<SalonJoin />} />
            <Route path="/salon/join/:shareLink" element={<SalonJoin />} />
            <Route path="/salons" element={<ProtectedRoute><MesSalons /></ProtectedRoute>} />
            <Route path="/salon/:code/history" element={<ProtectedRoute><SalonHistory /></ProtectedRoute>} />
            <Route path="/salon/:code" element={<SalonLobby />} />
            <Route path="/passeportmarseillais" element={<PermisHome />} />
            <Route path="/passeportmarseillais/exam" element={<PermisExam />} />
            <Route path="/passeportmarseillais/historique" element={<PermisHistory />} />
            <Route path="/permis" element={<Navigate to="/passeportmarseillais" replace />} />
            <Route path="/certificat/:code" element={<CertificatePublic />} />
            <Route path="/tournee" element={<TourneeBar />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/shop" element={<Navigate to="/packs?tab=cosmetics" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </NavDirectionContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <BottomNav />
      <AuthModal />
    </BrowserRouter>
  );
}
