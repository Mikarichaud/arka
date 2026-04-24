import { createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home/Home';
import Auth from './pages/Auth/Auth';
import SessionSetup from './pages/Session/SessionSetup';
import PackSelection from './pages/Packs/PackSelection';
import PackLibrary from './pages/Packs/PackLibrary';
import Editor from './pages/Editor/Editor';
import Game from './pages/Game/Game';
import Gallery from './pages/Gallery/Gallery';
import History from './pages/History/History';
import Premium from './pages/Premium/Premium';
import PremiumSuccess from './pages/Premium/PremiumSuccess';
import Profile from './pages/Profile/Profile';
import ProtectedRoute from './components/ProtectedRoute';

export const NavDirectionContext = createContext(1);
export const useNavDirection = () => useContext(NavDirectionContext);

// Pages sans slide (jeu plein écran, galerie)
const NO_SLIDE = ['/game', '/gallery'];

function AnimatedRoutes() {
  const location = useLocation();
  const navType = useNavigationType();
  const direction = navType === 'POP' ? -1 : 1;

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
      <AnimatePresence mode="wait" custom={direction}>
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
            <Route path="/login" element={<Auth />} />
            <Route path="/session/setup" element={<SessionSetup />} />
            <Route path="/session/pack" element={<PackSelection />} />
            <Route path="/packs" element={<PackLibrary />} />
            <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
            <Route path="/game" element={<Game />} />
            <Route path="/gallery/:shareLink" element={<Gallery />} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/premium" element={<Premium />} />
            <Route path="/premium/success" element={<PremiumSuccess />} />
            <Route path="/profile" element={<Profile />} />
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
    </BrowserRouter>
  );
}
