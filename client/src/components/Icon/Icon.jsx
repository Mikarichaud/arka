// Palette Marseille
// Bleu azur OM : #0057A8  |  Or étoile : #C9A84C / #E0C070
// Rouge passion : #E63946  |  Vert valide : #2DC653  |  Nuit Goudes : #0D1B3E

// Les icônes sont des fonctions pour que chaque instance ait des IDs de gradient uniques
const icons = {

  /* ── Contrôles UI ──────────────────────────────────────────── */

  'sound-on': (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#0057A8"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="#C9A84C" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="#E0C070" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),

  'sound-off': (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#94a3b8"/>
      <line x1="23" y1="9" x2="17" y2="15" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="17" y1="9" x2="23" y2="15" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),

  moon: (id) => (
    <svg viewBox="0 0 24 24">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E0C070"/>
          <stop offset="100%" stopColor="#C9A84C"/>
        </linearGradient>
      </defs>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={`url(#${id}-g)`}/>
      <circle cx="16" cy="8" r="1" fill="#fff" opacity="0.4"/>
    </svg>
  ),

  sun: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <radialGradient id={`${id}-g`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FCD34D"/>
          <stop offset="100%" stopColor="#F59E0B"/>
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="5" fill={`url(#${id}-g)`}/>
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line key={i}
            x1={12 + 7 * Math.cos(rad)} y1={12 + 7 * Math.sin(rad)}
            x2={12 + 10 * Math.cos(rad)} y2={12 + 10 * Math.sin(rad)}
            stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"
          />
        );
      })}
    </svg>
  ),

  /* ── Actions de jeu ────────────────────────────────────────── */

  check: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#2DC653" opacity="0.15"/>
      <circle cx="12" cy="12" r="11" fill="none" stroke="#2DC653" strokeWidth="1.5"/>
      <polyline points="6 12 10 16 18 8" stroke="#2DC653" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  cross: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" fill="#E63946" opacity="0.15"/>
      <circle cx="12" cy="12" r="11" fill="none" stroke="#E63946" strokeWidth="1.5"/>
      <line x1="8" y1="8" x2="16" y2="16" stroke="#E63946" strokeWidth="2.8" strokeLinecap="round"/>
      <line x1="16" y1="8" x2="8" y2="16" stroke="#E63946" strokeWidth="2.8" strokeLinecap="round"/>
    </svg>
  ),

  lightning: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCD34D"/>
          <stop offset="100%" stopColor="#C9A84C"/>
        </linearGradient>
      </defs>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
        fill={`url(#${id}-g)`} stroke="#F59E0B" strokeWidth="0.8"/>
    </svg>
  ),

  camera: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        fill="#0057A8"/>
      <circle cx="12" cy="13" r="4.5" fill="#0D1B3E" stroke="#C9A84C" strokeWidth="1.8"/>
      <circle cx="12" cy="13" r="2.5" fill="#1a3a6b"/>
      <circle cx="10.5" cy="11.5" r="0.8" fill="#E0C070" opacity="0.6"/>
    </svg>
  ),

  radar: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M1.42 9a16 16 0 0 1 21.16 0" stroke="#0057A8" strokeWidth="2" strokeLinecap="round" opacity="0.35"/>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" stroke="#0057A8" strokeWidth="2" strokeLinecap="round" opacity="0.65"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="#0057A8" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="12" cy="20" r="2.2" fill="#2DC653"/>
      <circle cx="12" cy="20" r="1" fill="#fff" opacity="0.8"/>
    </svg>
  ),

  /* ── Médailles & trophées ──────────────────────────────────── */

  'medal-gold': (id) => (
    <svg viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={`${id}-r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0057A8"/>
          <stop offset="50%" stopColor="#1a7fd4"/>
          <stop offset="100%" stopColor="#003d7a"/>
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCD34D"/>
          <stop offset="100%" stopColor="#C9A84C"/>
        </linearGradient>
      </defs>
      <path d="M10 2 L13.5 12 H18.5 L22 2 Z" fill={`url(#${id}-r)`}/>
      <line x1="13" y1="2" x2="16" y2="12" stroke="#fff" strokeWidth="0.6" strokeOpacity="0.3"/>
      <circle cx="16" cy="21" r="9.5" fill="#0D1B3E" opacity="0.2"/>
      <circle cx="16" cy="21" r="9" fill={`url(#${id}-c)`}/>
      <circle cx="16" cy="21" r="7" fill="none" stroke="#FCD34D" strokeWidth="0.8" strokeOpacity="0.6"/>
      <text x="16" y="25.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="bold" fontSize="11" fill="#7c3f00">1</text>
    </svg>
  ),

  'medal-silver': (id) => (
    <svg viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={`${id}-r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0057A8"/>
          <stop offset="100%" stopColor="#003d7a"/>
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8edf2"/>
          <stop offset="100%" stopColor="#94a3b8"/>
        </linearGradient>
      </defs>
      <path d="M10 2 L13.5 12 H18.5 L22 2 Z" fill={`url(#${id}-r)`}/>
      <line x1="13" y1="2" x2="16" y2="12" stroke="#fff" strokeWidth="0.6" strokeOpacity="0.3"/>
      <circle cx="16" cy="21" r="9.5" fill="#0D1B3E" opacity="0.2"/>
      <circle cx="16" cy="21" r="9" fill={`url(#${id}-c)`}/>
      <circle cx="16" cy="21" r="7" fill="none" stroke="#e2e8f0" strokeWidth="0.8" strokeOpacity="0.6"/>
      <text x="16" y="25.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="bold" fontSize="11" fill="#334155">2</text>
    </svg>
  ),

  'medal-bronze': (id) => (
    <svg viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={`${id}-r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0057A8"/>
          <stop offset="100%" stopColor="#003d7a"/>
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8a87c"/>
          <stop offset="100%" stopColor="#a0522d"/>
        </linearGradient>
      </defs>
      <path d="M10 2 L13.5 12 H18.5 L22 2 Z" fill={`url(#${id}-r)`}/>
      <line x1="13" y1="2" x2="16" y2="12" stroke="#fff" strokeWidth="0.6" strokeOpacity="0.3"/>
      <circle cx="16" cy="21" r="9.5" fill="#0D1B3E" opacity="0.2"/>
      <circle cx="16" cy="21" r="9" fill={`url(#${id}-c)`}/>
      <circle cx="16" cy="21" r="7" fill="none" stroke="#e8a87c" strokeWidth="0.8" strokeOpacity="0.6"/>
      <text x="16" y="25.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="bold" fontSize="11" fill="#3b1a08">3</text>
    </svg>
  ),

  trophy: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCD34D"/>
          <stop offset="100%" stopColor="#C9A84C"/>
        </linearGradient>
      </defs>
      <path d="M8 3 H16 L16 10 C16 14 12 17 12 17 C12 17 8 14 8 10 Z" fill={`url(#${id}-g)`}/>
      <path d="M8 5 H5 C5 5 4 9 7 10" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M16 5 H19 C19 5 20 9 17 10" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <line x1="12" y1="17" x2="12" y2="20" stroke="#C9A84C" strokeWidth="2"/>
      <rect x="8" y="20" width="8" height="2" rx="1" fill="#0057A8"/>
      <path d="M10 6 L10 12" stroke="#FCD34D" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),

  /* ── Geste fada (pince marseillaise) ──────────────────────── */

  pinch: (id) => (
    <svg viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5c9a0"/>
          <stop offset="100%" stopColor="#e8a87c"/>
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="10" rx="5" ry="6" fill={`url(#${id}-g)`} stroke="#c9855a" strokeWidth="0.8"/>
      <line x1="13" y1="5" x2="12" y2="8" stroke="#c9855a" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="16" y1="4" x2="16" y2="7" stroke="#c9855a" strokeWidth="0.8" strokeLinecap="round"/>
      <line x1="19" y1="5" x2="20" y2="8" stroke="#c9855a" strokeWidth="0.8" strokeLinecap="round"/>
      <path d="M11 16 Q11 22 16 24 Q21 22 21 16 L21 13 Q21 11 16 11 Q11 11 11 13 Z"
        fill={`url(#${id}-g)`} stroke="#c9855a" strokeWidth="0.8"/>
      {/* Lignes d'énergie rouge — passion marseillaise */}
      <line x1="16" y1="0" x2="16" y2="3" stroke="#E63946" strokeWidth="2" strokeLinecap="round"/>
      <line x1="7"  y1="3" x2="9"  y2="5" stroke="#E63946" strokeWidth="2" strokeLinecap="round"/>
      <line x1="25" y1="3" x2="23" y2="5" stroke="#E63946" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  /* ── Icônes de thèmes ──────────────────────────────────────── */

  anchor: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0057A8"/>
          <stop offset="100%" stopColor="#003d7a"/>
        </linearGradient>
      </defs>
      <circle cx="12" cy="5" r="3" fill="none" stroke={`url(#${id}-g)`} strokeWidth="2.2"/>
      <line x1="7" y1="8" x2="17" y2="8" stroke={`url(#${id}-g)`} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="12" y1="8" x2="12" y2="20" stroke={`url(#${id}-g)`} strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M5 13 C3 17 5 21 12 21 C19 21 21 17 19 13"
        stroke={`url(#${id}-g)`} strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <circle cx="5"  cy="13" r="1.8" fill="#C9A84C"/>
      <circle cx="19" cy="13" r="1.8" fill="#C9A84C"/>
    </svg>
  ),

  party: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      {/* Serpentin bleu azur */}
      <path d="M3 20 Q6 15 9 17 Q12 19 15 13 Q18 7 21 10"
        stroke="#0057A8" strokeWidth="2.2" strokeLinecap="round"/>
      {/* Carré or */}
      <rect x="3.5" y="3.5" width="4" height="4" rx="0.5" fill="#C9A84C" transform="rotate(25 5.5 5.5)"/>
      {/* Cercle rouge */}
      <circle cx="18" cy="5" r="2.2" fill="#E63946"/>
      {/* Losange blanc cassé */}
      <path d="M14 4 L16 6.5 L14 9 L12 6.5 Z" fill="#F5F5F0" stroke="#C9A84C" strokeWidth="0.6"/>
      {/* Étoile or */}
      <path d="M21 16 L22 14 L23 16 L21.2 15 L22.8 15 Z" fill="#C9A84C"/>
      {/* Triangle bleu */}
      <path d="M3 9 L5.5 5.5 L8 9 Z" fill="#0057A8" opacity="0.75"/>
      {/* Points confetti */}
      <circle cx="10" cy="3"  r="1.3" fill="#E63946"/>
      <circle cx="20" cy="12" r="1"   fill="#2DC653"/>
      <circle cx="5"  cy="15" r="0.9" fill="#C9A84C"/>
    </svg>
  ),

  football: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="100%" stopColor="#dde8f5"/>
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill={`url(#${id}-g)`} stroke="#0057A8" strokeWidth="1.5"/>
      {/* Pentagones bleu azur OM */}
      <path d="M12 4 L14.5 7 L13 10 L11 10 L9.5 7 Z"          fill="#0057A8"/>
      <path d="M4.5 9  L7.5 9  L9  12 L7  14 L4  12 Z"          fill="#0057A8" opacity="0.8"/>
      <path d="M19.5 9 L16.5 9 L15 12 L17 14 L20 12 Z"          fill="#0057A8" opacity="0.8"/>
      <path d="M7  18 L8  15 L11 14.5 L13 16 L11.5 19 Z"         fill="#0057A8" opacity="0.6"/>
      <path d="M17 18 L16 15 L13 14.5 L11 16 L12.5 19 Z"         fill="#0057A8" opacity="0.6"/>
    </svg>
  ),

  heart: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6b7a"/>
          <stop offset="100%" stopColor="#E63946"/>
        </linearGradient>
      </defs>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={`url(#${id}-g)`}/>
      <path d="M8 7 Q10 5 12 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),

  balloon: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <radialGradient id={`${id}-g`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ff6b7a"/>
          <stop offset="60%" stopColor="#E63946"/>
          <stop offset="100%" stopColor="#b02030"/>
        </radialGradient>
      </defs>
      <ellipse cx="12" cy="10" rx="7" ry="8" fill={`url(#${id}-g)`}/>
      <path d="M11 18 Q12 19 13 18" stroke="#b02030" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M12 19 Q10 21 12 23" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <ellipse cx="9.5" cy="7" rx="2" ry="2.5" fill="#fff" opacity="0.25" transform="rotate(-15 9.5 7)"/>
    </svg>
  ),

  pencil: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCD34D"/>
          <stop offset="100%" stopColor="#C9A84C"/>
        </linearGradient>
      </defs>
      <path d="M17 2 L22 7 L8 21 L3 22 L4 17 Z" fill={`url(#${id}-g)`} stroke="#C9A84C" strokeWidth="0.5"/>
      <path d="M3 22 L4 17 L8 21 Z" fill="#0057A8"/>
      <line x1="4" y1="20" x2="6" y2="22" stroke="#0D1B3E" strokeWidth="0.8" strokeLinecap="round"/>
      <rect x="18.5" y="2.5" width="3" height="2.5" rx="0.5" fill="#E63946" transform="rotate(45 20 4)"/>
      <line x1="16" y1="3" x2="18.5" y2="5.5" stroke="#0D1B3E" strokeWidth="1.5"/>
    </svg>
  ),

  /* ── Roulette / roue ───────────────────────────────────────── */

  wheel: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A84C"/>
          <stop offset="100%" stopColor="#8a6a20"/>
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="#0057A8"/>
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line key={i}
            x1={12} y1={12}
            x2={12 + 10.5 * Math.cos(rad)} y2={12 + 10.5 * Math.sin(rad)}
            stroke={i % 2 === 0 ? '#C9A84C' : 'rgba(255,255,255,0.25)'}
            strokeWidth={i % 2 === 0 ? 1.3 : 0.8}
          />
        );
      })}
      <circle cx="12" cy="12" r="11" fill="none" stroke={`url(#${id}-g)`} strokeWidth="2"/>
      <circle cx="12" cy="12" r="2.5" fill="#fff"/>
      <circle cx="12" cy="12" r="1.5" fill="#C9A84C"/>
    </svg>
  ),

  /* ── Vague méditerranée ────────────────────────────────────── */

  wave: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0057A8"/>
          <stop offset="100%" stopColor="#1a7fd4"/>
        </linearGradient>
      </defs>
      <path d="M2 11 C4 8 6 8 8 11 S12 14 14 11 S18 8 20 11 S22 11 22 11"
        stroke={`url(#${id}-g)`} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M2 16 C4 13 6 13 8 16 S12 19 14 16 S18 13 20 16 S22 16 22 16"
        stroke="#0057A8" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
    </svg>
  ),

  /* ── Points d'attente (trois couleurs OM) ──────────────────── */

  dots: (id) => (
    <svg viewBox="0 0 40 12" fill="none">
      <circle cx="6"  cy="6" r="5" fill="#C9A84C"/>
      <circle cx="20" cy="6" r="5" fill="#0057A8"/>
      <circle cx="34" cy="6" r="5" fill="#E63946"/>
    </svg>
  ),

  /* ── Photo / galerie ───────────────────────────────────────── */

  photo: (id) => (
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0057A8"/>
          <stop offset="100%" stopColor="#003d7a"/>
        </linearGradient>
      </defs>
      <rect x="1" y="5" width="22" height="16" rx="2" fill={`url(#${id}-g)`}/>
      <path d="M7 5 L9 2 L15 2 L17 5" fill="#003d7a"/>
      <circle cx="12" cy="13" r="5"   fill="#0D1B3E" stroke="#C9A84C" strokeWidth="1.5"/>
      <circle cx="12" cy="13" r="3"   fill="#1a3a6b"/>
      <circle cx="12" cy="13" r="1.5" fill="#0057A8" opacity="0.5"/>
      <circle cx="19" cy="8"  r="1.2" fill="#FCD34D"/>
    </svg>
  ),

};

let _counter = 0;

export default function Icon({ name, size = 20, className = '', style = {} }) {
  const fn = icons[name];
  if (!fn) return null;
  // ID unique par montage pour éviter les conflits de gradient entre instances
  const id = `ico-${name}-${++_counter}`;
  return (
    <span
      className={`icon ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {fn(id)}
    </span>
  );
}
