import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Browser } from '@capacitor/browser';
import { Keyboard } from '@capacitor/keyboard';

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

// Maintient <meta name="theme-color"> à la couleur du fond courant (html, adapté
// par page + thème via :has()). Le natif observe webView.themeColor (KVO) et
// recolore la zone d'overscroll en conséquence. Utile aussi à la barre du navigateur web.
function syncThemeColor() {
  if (typeof document === 'undefined') return;
  const bg = getComputedStyle(document.documentElement).backgroundColor;
  if (!bg) return;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', bg);
}

// Init une fois (web + natif). Le fond (html/body) transitionne (~0.2-0.3s) aussi
// bien au changement de thème qu'au changement de page (sélecteurs :has()). On
// resynchronise à la FIN de cette transition → la couleur reflète toujours la page
// courante, sans dépendre du timing du routeur (en mode "wait", l'ancienne page est
// encore affichée quand le routeur notifie → on lirait la mauvaise couleur).
export function initThemeColor() {
  if (typeof document === 'undefined') return;
  syncThemeColor();
  document.documentElement.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'background-color') return;
    if (e.target !== document.documentElement && e.target !== document.body) return;
    syncStatusBar();
  });
  // Fallback si les transitions sont coupées (prefers-reduced-motion) : pas de
  // transitionend → on resync sur le toggle de thème.
  const obs = new MutationObserver(() => requestAnimationFrame(syncStatusBar));
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

// À appeler à chaque changement d'écran (le fond peut changer).
export function syncStatusBar() {
  syncThemeColor();
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
  // Clavier ouvert (resize:native fait monter la WebView) → on masque la barre
  // d'onglets, sinon elle flotte juste au-dessus du clavier.
  Keyboard.addListener('keyboardWillShow', () => document.body.classList.add('keyboard-open')).catch(() => {});
  Keyboard.addListener('keyboardWillHide', () => document.body.classList.remove('keyboard-open')).catch(() => {});
  // Filet de sécurité : si l'app ne monte pas (hideSplash jamais appelé), on masque
  // quand même le splash au bout de 4s pour ne pas rester bloqué dessus.
  setTimeout(hideSplash, 4000);
}
