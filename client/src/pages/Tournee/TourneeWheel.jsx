import { motion } from 'framer-motion';

// Roue à N parts (prénoms), DA « Vélodrome » : jante chrome, parts métal brillantes,
// bille dorée centrale, aiguille cochonnet. Reprend les défs SVG du <Roulette> du jeu.
const METALS = [
  { base: '#0057A8', text: '#ffffff' }, // bleu OM
  { base: '#dcdcd0', text: '#1a2740' }, // blanc Vélodrome
  { base: '#0057A8', text: '#ffffff' },
  { base: '#C9A84C', text: '#2a2208' }, // or étoile
  { base: '#0057A8', text: '#ffffff' },
  { base: '#dcdcd0', text: '#1a2740' },
  { base: '#0057A8', text: '#ffffff' },
  { base: '#C9A84C', text: '#2a2208' },
];

function arcPath(cx, cy, r, startDeg, endDeg) {
  const a0 = (startDeg - 90) * Math.PI / 180;
  const a1 = (endDeg - 90) * Math.PI / 180;
  const x0 = cx + r * Math.cos(a0); const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1); const y1 = cy + r * Math.sin(a1);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`;
}

export default function TourneeWheel({ names, rotation, winner, landed, onRest, preview }) {
  const n = names.length;
  const ang = 360 / n;

  return (
    <div className={`tw-wrap${preview ? ' tw-wrap--preview' : ''}`}>
      {/* Aiguille cochonnet chrome, fixe en haut */}
      <div className="tw-pin">
        <svg width="22" height="38" viewBox="0 0 24 40">
          <defs>
            <linearGradient id="tw-needle" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5a5a7a" /><stop offset="30%" stopColor="#b0b0d0" />
              <stop offset="55%" stopColor="#e8e8f8" /><stop offset="75%" stopColor="#a0a0c0" /><stop offset="100%" stopColor="#4a4a6a" />
            </linearGradient>
            <radialGradient id="tw-needle-ball" cx="38%" cy="32%" r="62%">
              <stop offset="0%" stopColor="#ffffff" /><stop offset="35%" stopColor="#d8d8f0" /><stop offset="70%" stopColor="#8888aa" /><stop offset="100%" stopColor="#3a3a5a" />
            </radialGradient>
          </defs>
          <polygon points="12,38 6,14 18,14" fill="url(#tw-needle)" stroke="#1a1a2e" strokeWidth="0.8" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="9" fill="url(#tw-needle-ball)" stroke="#1a1a2e" strokeWidth="1" />
          <ellipse cx="9" cy="7" rx="3.5" ry="2.5" fill="rgba(255,255,255,0.65)" />
        </svg>
      </div>

      <motion.div
        className="tw-disc"
        animate={{ rotate: rotation }}
        transition={{ duration: 4.2, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => { if (rotation > 0) onRest?.(); }}
      >
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <defs>
            <radialGradient id="tw-sheen" cx="72" cy="52" r="105" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
              <stop offset="45%" stopColor="rgba(255,255,255,0.03)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.42)" />
            </radialGradient>
            <pattern id="tw-strie" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" />
            </pattern>
            <radialGradient id="tw-chrome" cx="50%" cy="50%" r="50%">
              <stop offset="86%" stopColor="#141422" /><stop offset="91%" stopColor="#5a5a7a" />
              <stop offset="95%" stopColor="#c0c0d8" /><stop offset="98%" stopColor="#e8e8f8" /><stop offset="100%" stopColor="#3a3a5a" />
            </radialGradient>
            <radialGradient id="tw-cochonnet" cx="36%" cy="30%" r="68%">
              <stop offset="0%" stopColor="#fff8d0" /><stop offset="25%" stopColor="#f0d060" /><stop offset="55%" stopColor="#C9A84C" />
              <stop offset="85%" stopColor="#9a7020" /><stop offset="100%" stopColor="#5a3c08" />
            </radialGradient>
            <radialGradient id="tw-winner" cx="72" cy="52" r="105" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fff0a0" /><stop offset="35%" stopColor="#e8c040" /><stop offset="70%" stopColor="#C9A84C" /><stop offset="100%" stopColor="#8a6010" />
            </radialGradient>
          </defs>

          <circle cx="100" cy="100" r="99.5" fill="url(#tw-chrome)" />

          {names.map((name, i) => {
            const start = i * ang; const end = start + ang; const mid = start + ang / 2;
            const m = METALS[i % METALS.length];
            const isWin = landed && winner === i;
            const path = arcPath(100, 100, 94, start, end);
            const tr = 62;
            const tx = 100 + tr * Math.cos((mid - 90) * Math.PI / 180);
            const ty = 100 + tr * Math.sin((mid - 90) * Math.PI / 180);
            const rad = ((start - 90) * Math.PI) / 180;
            const ex = 100 + 94 * Math.cos(rad); const ey = 100 + 94 * Math.sin(rad);
            return (
              <g key={i}>
                <path d={path} fill={isWin ? '#8a6010' : m.base} />
                {!isWin && <path d={path} fill="url(#tw-strie)" />}
                <path d={path} fill={isWin ? 'url(#tw-winner)' : 'url(#tw-sheen)'} opacity={isWin ? 1 : 0.9} />
                <line x1="100" y1="100" x2={ex} y2={ey} stroke="rgba(0,0,0,0.75)" strokeWidth="1.2" />
                <text
                  x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                  fill={isWin ? '#2a2208' : m.text}
                  fontSize={n > 7 ? 9 : 12} fontWeight="800"
                  fontFamily="Bebas Neue, Impact, sans-serif" letterSpacing="0.04em"
                  transform={`rotate(${mid}, ${tx}, ${ty})`}
                >
                  {name.length > 10 ? `${name.slice(0, 9)}…` : name}
                </text>
              </g>
            );
          })}

          {/* Bille dorée centrale */}
          <circle cx="100" cy="100" r="20" fill="#141422" />
          <circle cx="100" cy="100" r="15" fill="url(#tw-cochonnet)" stroke="#5a3c08" strokeWidth="0.6" />
          <ellipse cx="95" cy="94" rx="5" ry="3.5" fill="rgba(255,255,255,0.55)" />
        </svg>
      </motion.div>
    </div>
  );
}
