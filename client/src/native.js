import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';

const PUBLIC_URL = 'https://roulademarseillaise.fr';

// Ouvre une page légale (/terms, /privacy) sans quitter l'app :
// - natif : navigateur in-app (SFSafariViewController, bouton "OK" pour revenir)
// - web : nouvel onglet
export function openLegal(path) {
  if (isNative) {
    Browser.open({ url: PUBLIC_URL + path, presentationStyle: 'popover' }).catch(() => {});
  } else if (typeof window !== 'undefined') {
    window.open(path, '_blank', 'noopener');
  }
}

// Vrai uniquement dans l'app native (Capacitor injecte window.Capacitor).
export const isNative =
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

// Masque le splash une fois l'app web prête (launchAutoHide:false côté config).
export function hideSplash() {
  if (!isNative) return;
  SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
}

// Vibration : haptique native iOS si dispo, sinon navigator.vibrate (web/Android web).
// style: 'light' | 'medium' | 'heavy'
export function haptic(style = 'medium') {
  if (isNative) {
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    Haptics.impact({ style: map[style] || ImpactStyle.Medium }).catch(() => {});
  } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(style === 'heavy' ? 80 : style === 'light' ? 30 : 60);
  }
}

// Choisit le style de la status bar selon la luminance du fond courant (html),
// qui est déjà adapté par écran via les sélecteurs :has() de global.css.
// Style.Dark = texte clair (fond sombre) ; Style.Light = texte sombre (fond clair).
function pickStyle() {
  const bg = getComputedStyle(document.documentElement).backgroundColor;
  const m = bg.match(/\d+/g);
  const lum = m ? (0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2]) / 255 : 1;
  return lum < 0.5 ? Style.Dark : Style.Light;
}

// À appeler à chaque changement d'écran (le fond peut changer).
export function syncStatusBar() {
  if (!isNative) return;
  requestAnimationFrame(() => {
    StatusBar.setStyle({ style: pickStyle() }).catch(() => {});
  });
}

// Init une fois au démarrage : marque le body en .native (CSS edge-to-edge) et
// fait flotter la status bar par-dessus le contenu (le fond de l'app passe dessous).
export function initNative() {
  if (!isNative) return;
  document.body.classList.add('native');
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  syncStatusBar();
  // Filet de sécurité : si l'app ne monte pas (hideSplash jamais appelé), on masque
  // quand même le splash au bout de 4s pour ne pas rester bloqué dessus.
  setTimeout(hideSplash, 4000);
}
