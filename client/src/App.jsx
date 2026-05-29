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
import AdminDashboard from './pages/Admin/Dashboard';
import SalonNew from './pages/Salon/SalonNew';
import SalonJoin from './pages/Salon/SalonJoin';
import SalonLobby from './pages/Salon/SalonLobby';
import MesSalons from './pages/Salon/MesSalons';
import SalonHistory from './pages/Salon/SalonHistory';
import ProtectedRoute from './components/ProtectedRoute';
import AuthModal from './components/AuthModal/AuthModal';
import AuthRouteRedirect from './components/AuthModal/AuthRouteRedirect';
import { FEATURES_UNLOCKED, STORE_BUILD } from './utils/permissions';

export const NavDirectionContext = createContext(1);
export const useNavDirection = () => useContext(NavDirectionContext);

// Pages sans slide (jeu plein écran, galerie, salons)
const NO_SLIDE = ['/game', '/gallery', '/salon/'];

function AnimatedRoutes() {
  const location = useLocation();
  const navType = useNavigationType();

  // À chaque changement d'écran : on remonte en haut + on resynchronise la status bar.
  useEffect(() => {
    window.scrollTo(0, 0);
    syncStatusBar();
  }, [location.pathname]);

  // App montée → on masque le splash natif (qui restait affiché pendant le chargement web).
  useEffect(() => { hideSplash(); }, []);
  // POP = navigation back/forward du browser → animation back (-1)
  // REPLACE avec state.dir='back' = un Quitter explicite qui doit s'animer comme back
  // (sinon l'animation default = forward, ce qui est faux pour un retour).
  const isBack = navType === 'POP' || location.state?.dir === 'back';
  const direction = isBack ? -1 : 1;

  const noSlide = NO_SLIDE.some((p) => location.pathname.startsWith(p));

  const variants = noSlide
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: (dir) => ({ x: dir > 0 ? '60vw' : '-60vw', opacity: 0 }),
        animate: { x: 0, opacity: 1 },
        exit: (dir) => ({ x: dir > 0 ? '-60vw' : '60vw', opacity: 0 }),
      };

  return (
    <NavDirectionContext.Provider value={direction}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={location.pathname}
          custom={direction}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            type: 'tween',
            ease: [0.25, 0.46, 0.45, 0.94],
            duration: noSlide ? 0.2 : 0.38,
          }}
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
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/salon/new" element={<ProtectedRoute><SalonNew /></ProtectedRoute>} />
            <Route path="/salon/join" element={<SalonJoin />} />
            <Route path="/salon/join/:shareLink" element={<SalonJoin />} />
            <Route path="/salons" element={<ProtectedRoute><MesSalons /></ProtectedRoute>} />
            <Route path="/salon/:code/history" element={<ProtectedRoute><SalonHistory /></ProtectedRoute>} />
            <Route path="/salon/:code" element={<SalonLobby />} />
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
