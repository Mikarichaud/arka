import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home/Home';
import Auth from './pages/Auth/Auth';
import SessionSetup from './pages/Session/SessionSetup';
import PackSelection from './pages/Packs/PackSelection';
import PackLibrary from './pages/Packs/PackLibrary';
import Editor from './pages/Editor/Editor';
import Game from './pages/Game/Game';
import Gallery from './pages/Gallery/Gallery';
import History from './pages/History/History';
import ProtectedRoute from './components/ProtectedRoute';

export const NavDirectionContext = createContext(1);
export const useNavDirection = () => useContext(NavDirectionContext);

function AnimatedRoutes() {
  const location = useLocation();
  const navType = useNavigationType();
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    setDirection(navType === 'POP' ? -1 : 1);
  }, [location.key, navType]);

  return (
    <NavDirectionContext.Provider value={direction}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/session/setup" element={<SessionSetup />} />
          <Route path="/session/pack" element={<PackSelection />} />
          <Route path="/packs" element={<PackLibrary />} />
          <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
          <Route path="/game" element={<Game />} />
          <Route path="/gallery/:shareLink" element={<Gallery />} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        </Routes>
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
