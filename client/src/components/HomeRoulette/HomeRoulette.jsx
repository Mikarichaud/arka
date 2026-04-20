import { useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './HomeRoulette.css';

const SLICE_ANGLE = 360 / 8;

const METALS = [
  { base: '#3d6080' }, { base: '#8a5f20' }, { base: '#1a3a5c' }, { base: '#8a6810' },
  { base: '#2d4d68' }, { base: '#6a3d10' }, { base: '#0e2840' }, { base: '#9a7015' },
];

function arcPath(cx, cy, r, startDeg, endDeg) {
  const toRad = (d) => ((d - 90) * Math.PI) / 180;
  const s = toRad(startDeg);
  const e = toRad(endDeg);
  const x1 = cx + r * Math.cos(s); const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e); const y2 = cy + r * Math.sin(e);
  return `M${cx},${cy} L${x1.toFixed(3)},${y1.toFixed(3)} A${r},${r} 0 0,1 ${x2.toFixed(3)},${y2.toFixed(3)} Z`;
}

export default function HomeRoulette({ onClick }) {
  const discRef = useRef(null);
  const controls = useAnimation();
  const [spinning, setSpinning] = useState(false);

  const handleClick = async () => {
    if (spinning) return;
    setSpinning(true);

    // Lire l'angle CSS courant pour partir sans saut visuel
    let currentAngle = 0;
    if (discRef.current) {
      const matrix = new DOMMatrix(getComputedStyle(discRef.current).transform);
      currentAngle = Math.round(Math.atan2(matrix.b, matrix.a) * (180 / Math.PI));
    }

    // Framer Motion prend le relais depuis l'angle exact
    controls.set({ rotate: currentAngle });
    await controls.start({
      rotate: currentAngle + 5 * 360,
      transition: { duration: 1.6, ease: [0.15, 0.8, 0.35, 1.0] },
    });
    onClick?.();
  };

  return (
    <div
      className="home-roulette"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label="Lancer une partie"
    >
      {/* Lueur externe pulsante */}
      <div className="home-roulette-glow" />

      {/* Aiguille chrome — toujours au sommet, ne tourne pas */}
      <div className="home-roulette-needle-wrap">
        <svg width="24" height="44" viewBox="0 0 24 44">
          <defs>
            <linearGradient id="hr-chrome" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#5a5a7a"/>
              <stop offset="30%"  stopColor="#b0b0d0"/>
              <stop offset="55%"  stopColor="#e8e8f8"/>
              <stop offset="75%"  stopColor="#a0a0c0"/>
              <stop offset="100%" stopColor="#4a4a6a"/>
            </linearGradient>
            <radialGradient id="hr-ball" cx="38%" cy="32%" r="62%">
              <stop offset="0%"   stopColor="#ffffff"/>
              <stop offset="35%"  stopColor="#d8d8f0"/>
              <stop offset="70%"  stopColor="#8888aa"/>
              <stop offset="100%" stopColor="#3a3a5a"/>
            </radialGradient>
          </defs>
          <polygon points="12,42 6,16 18,16"
            fill="url(#hr-chrome)" stroke="#1a1a2e" strokeWidth="0.8" strokeLinejoin="round"/>
          <circle cx="12" cy="11" r="10" fill="url(#hr-ball)" stroke="#1a1a2e" strokeWidth="1"/>
          <ellipse cx="9" cy="8" rx="3.5" ry="2.5" fill="rgba(255,255,255,0.65)"/>
        </svg>
      </div>

      {/* Disque — CSS idle-spin, puis Framer Motion au clic */}
      <motion.div
        ref={discRef}
        className={`home-roulette-disc ${spinning ? 'no-css-spin' : 'idle-css-spin'}`}
        animate={controls}
      >
        <svg viewBox="0 0 200 200" className="home-roulette-svg">
          <defs>
            <radialGradient id="hr-sheen" cx="72" cy="52" r="105" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.32)"/>
              <stop offset="45%"  stopColor="rgba(255,255,255,0.03)"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.42)"/>
            </radialGradient>
            <pattern id="hr-strie" x="0" y="0" width="4" height="4"
              patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7"/>
            </pattern>
            <radialGradient id="hr-chrome-ring" cx="50%" cy="50%" r="50%">
              <stop offset="86%" stopColor="#141422"/>
              <stop offset="91%" stopColor="#5a5a7a"/>
              <stop offset="95%" stopColor="#c0c0d8"/>
              <stop offset="98%" stopColor="#e8e8f8"/>
              <stop offset="100%" stopColor="#3a3a5a"/>
            </radialGradient>
            <radialGradient id="hr-cochonnet" cx="36%" cy="30%" r="68%">
              <stop offset="0%"   stopColor="#fff8d0"/>
              <stop offset="25%"  stopColor="#f0d060"/>
              <stop offset="55%"  stopColor="#C9A84C"/>
              <stop offset="85%"  stopColor="#9a7020"/>
              <stop offset="100%" stopColor="#5a3c08"/>
            </radialGradient>
            <filter id="hr-engrave">
              <feDropShadow dx="0.7" dy="0.9" stdDeviation="0.3" floodColor="#000" floodOpacity="0.9"/>
              <feDropShadow dx="-0.4" dy="-0.4" stdDeviation="0.2" floodColor="#fff" floodOpacity="0.2"/>
            </filter>
          </defs>

          <circle cx="100" cy="100" r="99.5" fill="url(#hr-chrome-ring)"/>

          {METALS.map((metal, i) => {
            const start = i * SLICE_ANGLE;
            const end   = start + SLICE_ANGLE;
            const mid   = start + SLICE_ANGLE / 2;
            const midRad = ((mid - 90) * Math.PI) / 180;
            const tx = 100 + 62 * Math.cos(midRad);
            const ty = 100 + 62 * Math.sin(midRad);
            const path = arcPath(100, 100, 94, start, end);
            const borderRad = ((start - 90) * Math.PI) / 180;
            const ex = 100 + 94 * Math.cos(borderRad);
            const ey = 100 + 94 * Math.sin(borderRad);
            return (
              <g key={i}>
                <path d={path} fill={metal.base}/>
                <path d={path} fill="url(#hr-strie)"/>
                <path d={path} fill="url(#hr-sheen)" opacity="0.9"/>
                <line x1="100" y1="100" x2={ex} y2={ey} stroke="rgba(0,0,0,0.75)"    strokeWidth="1.4"/>
                <line x1="100" y1="100" x2={ex} y2={ey} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
                <text x={tx} y={ty}
                  textAnchor="middle" dominantBaseline="central"
                  fill="rgba(255,255,255,0.95)" fontSize="15"
                  fontFamily="Bebas Neue, Impact, sans-serif"
                  letterSpacing="0.04em" filter="url(#hr-engrave)"
                  transform={`rotate(${mid}, ${tx}, ${ty})`}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >{i + 1}</text>
              </g>
            );
          })}

          <circle cx="100" cy="100" r="94"   fill="none" stroke="rgba(0,0,0,0.65)"        strokeWidth="1.8"/>
          <circle cx="100" cy="100" r="92.5" fill="none" stroke="rgba(255,255,255,0.07)"  strokeWidth="0.6"/>

          {/* Cochonnet doré central */}
          <circle cx="100" cy="100" r="20" fill="#0d0d1e" stroke="rgba(0,0,0,0.9)" strokeWidth="2.5"/>
          <circle cx="100" cy="100" r="17" fill="url(#hr-cochonnet)"/>
          <ellipse cx="95" cy="94" rx="4.5" ry="3" fill="rgba(255,255,255,0.42)"/>
        </svg>
      </motion.div>

      {!spinning && (
        <p className="home-roulette-cta">Appuie pour jouer</p>
      )}
    </div>
  );
}
