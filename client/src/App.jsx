import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from './pages/Home/Home';
import Auth from './pages/Auth/Auth';
import SessionSetup from './pages/Session/SessionSetup';
import PackSelection from './pages/Packs/PackSelection';
import PackLibrary from './pages/Packs/PackLibrary';
import Editor from './pages/Editor/Editor';
import Game from './pages/Game/Game';
import ProtectedRoute from './components/ProtectedRoute';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/session/setup" element={<SessionSetup />} />
        <Route path="/session/pack" element={<PackSelection />} />
        <Route path="/packs" element={<PackLibrary />} />
        <Route path="/editor" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
