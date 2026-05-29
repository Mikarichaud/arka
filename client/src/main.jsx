import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/bebas-neue';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/pacifico';
import './styles/global.css';
import App from './App.jsx';
import { STORE_BUILD } from './utils/permissions';
import { initNative } from './native';

initNative();

// Service worker PWA : uniquement sur le web en prod. Désactivé sur le build natif
// (Capacitor / WKWebView) où il entre en conflit avec la coquille native.
if (import.meta.env.PROD && !STORE_BUILD) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
