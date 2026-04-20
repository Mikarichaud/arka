import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './Roulette.css';

const SLICE_COUNT = 8;
const SLICE_ANGLE = 360 / SLICE_COUNT;

// Palette pétanque : 8 métaux distincts alternés acier/bronze
const METALS = [
  { hi: '#6898c8', base: '#3d6080', lo: '#1c3a52' }, // Acier azur
  { hi: '#c89038', base: '#8a5f20', lo: '#4a2c08' }, // Bronze
  { hi: '#2a5a8a', base: '#1a3a5c', lo: '#0a1e30' }, // Marine profond
  { hi: '#d4a828', base: '#8a6810', lo: '#4a3808' }, // Or marseillais
  { hi: '#4a7890', base: '#2d4d68', lo: '#122030' }, // Acier foncé
  { hi: '#a86028', base: '#6a3d10', lo: '#3a1a05' }, // Cuivre
  { hi: '#1a4568', base: '#0e2840', lo: '#060f18' }, // Nuit port
  { hi: '#d8a828', base: '#9a7015', lo: '#5a4008' }, // Ambre
];

// Génère le path SVG d'une tranche de camembert
function arcPath(cx, cy, r, startDeg, endDeg) {
  const toRad = (d) => ((d - 90) * Math.PI) / 180;
  const s = toRad(startDeg);
  const e = toRad(endDeg);
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  return `M${cx},${cy} L${x1.toFixed(3)},${y1.toFixed(3)} A${r},${r} 0 0,1 ${x2.toFixed(3)},${y2.toFixed(3)} Z`;
}

export default function Roulette({ challenges = [], targetIndex, isSpinning, onSpinEnd }) {
  const controls = useAnimation();
  const currentRotation = useRef(0);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!isSpinning || targetIndex === null || targetIndex === undefined) return;

    setLanded(false);
    const targetOrientation = (360 - (targetIndex * SLICE_ANGLE + SLICE_ANGLE / 2)) % 360;
    const currentVisual = currentRotation.current % 360;
    let delta = (targetOrientation - currentVisual + 360) % 360;
    if (delta < 15) delta += 360;

    const finalAngle = currentRotation.current + 6 * 360 + delta;

    controls.start({
      rotate: finalAngle,
      transition: { duration: 4, ease: [0.08, 0.6, 0.12, 1.0] },
    }).then(() => {
      currentRotation.current = finalAngle;
      setLanded(true);
      onSpinEnd?.();
    });
  }, [isSpinning, targetIndex]);

  return (
    <div className={`roulette-wrapper ${isSpinning ? 'is-spinning' : ''} ${landed && !isSpinning ? 'has-landed' : ''}`}>

      {/* Lueur externe pendant le spin */}
      {isSpinning && <div className="roulette-glow-ring" />}

      {/* Aiguille chrome — cochonnet posé sur le rebord */}
      <div className={`roulette-needle-wrap ${isSpinning ? 'vibrating' : ''}`}>
        <svg width="24" height="40" viewBox="0 0 24 40" className="roulette-needle-svg">
          <defs>
            <linearGradient id="needle-chrome" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#5a5a7a"/>
              <stop offset="30%"  stopColor="#b0b0d0"/>
              <stop offset="55%"  stopColor="#e8e8f8"/>
              <stop offset="75%"  stopColor="#a0a0c0"/>
              <stop offset="100%" stopColor="#4a4a6a"/>
            </linearGradient>
            <radialGradient id="needle-ball" cx="38%" cy="32%" r="62%">
              <stop offset="0%"   stopColor="#ffffff"/>
              <stop offset="35%"  stopColor="#d8d8f0"/>
              <stop offset="70%"  stopColor="#8888aa"/>
              <stop offset="100%" stopColor="#3a3a5a"/>
            </radialGradient>
          </defs>
          {/* Corps effilé */}
          <polygon
            points="12,38 6,14 18,14"
            fill="url(#needle-chrome)"
            stroke="#1a1a2e"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Tête sphérique */}
          <circle cx="12" cy="10" r="9" fill="url(#needle-ball)" stroke="#1a1a2e" strokeWidth="1"/>
          {/* Reflet */}
          <ellipse cx="9" cy="7" rx="3.5" ry="2.5" fill="rgba(255,255,255,0.65)"/>
        </svg>
      </div>

      {/* Disque qui tourne */}
      <motion.div className="roulette-disc" animate={controls}>
        <svg viewBox="0 0 200 200" className="roulette-svg">
          <defs>
            {/* Brillance métallique globale — simule lumière venue du haut-gauche */}
            <radialGradient id="metal-sheen" cx="35%" cy="25%" r="72%" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.38)"/>
              <stop offset="40%"  stopColor="rgba(255,255,255,0.06)"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.50)"/>
            </radialGradient>

            {/* Texture rainures — stries radiales des boules de pétanque */}
            <pattern id="strie" x="0" y="0" width="4" height="4"
              patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7"/>
            </pattern>

            {/* Anneau chrome extérieur */}
            <radialGradient id="chrome-ring" cx="50%" cy="50%" r="50%">
              <stop offset="86%" stopColor="#141422"/>
              <stop offset="91%" stopColor="#5a5a7a"/>
              <stop offset="95%" stopColor="#c0c0d8"/>
              <stop offset="98%" stopColor="#e8e8f8"/>
              <stop offset="100%" stopColor="#3a3a5a"/>
            </radialGradient>

            {/* Cochonnet (bouchon doré central) */}
            <radialGradient id="cochonnet" cx="36%" cy="30%" r="68%">
              <stop offset="0%"   stopColor="#fff8d0"/>
              <stop offset="25%"  stopColor="#f0d060"/>
              <stop offset="55%"  stopColor="#C9A84C"/>
              <stop offset="85%"  stopColor="#9a7020"/>
              <stop offset="100%" stopColor="#5a3c08"/>
            </radialGradient>

            {/* Filtre gravure — effet estampillé sur les numéros */}
            <filter id="engrave">
              <feDropShadow dx="0.7" dy="0.9" stdDeviation="0.3" floodColor="#000000" floodOpacity="0.9"/>
              <feDropShadow dx="-0.4" dy="-0.4" stdDeviation="0.2" floodColor="#ffffff" floodOpacity="0.2"/>
            </filter>

            {/* Gradients par slice */}
            {METALS.map((m, i) => (
              <radialGradient key={i} id={`m${i}`} cx="30%" cy="20%" r="90%" gradientUnits="objectBoundingBox">
                <stop offset="0%"   stopColor={m.hi}/>
                <stop offset="55%"  stopColor={m.base}/>
                <stop offset="100%" stopColor={m.lo}/>
              </radialGradient>
            ))}

            {/* Gradient case gagnante */}
            <radialGradient id="winner-gold" cx="35%" cy="28%" r="80%" gradientUnits="objectBoundingBox">
              <stop offset="0%"   stopColor="#fff0a0"/>
              <stop offset="40%"  stopColor="#e8c040"/>
              <stop offset="75%"  stopColor="#C9A84C"/>
              <stop offset="100%" stopColor="#8a6010"/>
            </radialGradient>
          </defs>

          {/* Fond chrome extérieur */}
          <circle cx="100" cy="100" r="99.5" fill="url(#chrome-ring)"/>

          {/* Slices métalliques */}
          {METALS.map((_, i) => {
            const start = i * SLICE_ANGLE;
            const end = start + SLICE_ANGLE;
            const mid = start + SLICE_ANGLE / 2;
            const midRad = ((mid - 90) * Math.PI) / 180;
            const tx = 100 + 66 * Math.cos(midRad);
            const ty = 100 + 66 * Math.sin(midRad);
            const tx2 = 100 + 44 * Math.cos(midRad);
            const ty2 = 100 + 44 * Math.sin(midRad);
            const isWinner = landed && !isSpinning && targetIndex === i;
            const path = arcPath(100, 100, 94, start, end);
            const challenge = challenges[i];

            return (
              <g key={i}>
                {/* Base métal ou or gagnant */}
                <path d={path} fill={isWinner ? 'url(#winner-gold)' : `url(#m${i})`}/>

                {/* Rainures stries (atténuées sur la case gagnante) */}
                {!isWinner && <path d={path} fill="url(#strie)"/>}

                {/* Brillance métallique */}
                <path d={path} fill="url(#metal-sheen)" opacity={isWinner ? 0.35 : 0.82}/>

                {/* Liseret de séparation gravé (encoches boule) */}
                {(() => {
                  const rad = ((start - 90) * Math.PI) / 180;
                  const ex = 100 + 94 * Math.cos(rad);
                  const ey = 100 + 94 * Math.sin(rad);
                  return (
                    <>
                      <line x1="100" y1="100" x2={ex} y2={ey}
                        stroke="rgba(0,0,0,0.75)" strokeWidth="1.4"/>
                      <line x1="100" y1="100" x2={ex} y2={ey}
                        stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
                    </>
                  );
                })()}

                {/* Numéro estampillé */}
                <text
                  x={tx} y={ty}
                  textAnchor="middle" dominantBaseline="central"
                  fill={isWinner ? '#1a1a2e' : 'rgba(255,255,255,0.95)'}
                  fontSize="14"
                  fontFamily="Bebas Neue, Impact, sans-serif"
                  letterSpacing="0.04em"
                  filter={isWinner ? undefined : 'url(#engrave)'}
                  transform={`rotate(${mid}, ${tx}, ${ty})`}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {i + 1}
                </text>

                {/* Libellé court du défi */}
                {challenge?.text && (
                  <text
                    x={tx2} y={ty2}
                    textAnchor="middle" dominantBaseline="central"
                    fill={isWinner ? 'rgba(26,26,46,0.7)' : 'rgba(255,255,255,0.45)'}
                    fontSize="4.2"
                    fontFamily="Nunito, sans-serif"
                    transform={`rotate(${mid}, ${tx2}, ${ty2})`}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {challenge.text.slice(0, 15)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Bord intérieur chrome sombre */}
          <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth="1.8"/>
          <circle cx="100" cy="100" r="92.5" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.6"/>

          {/* ── Cochonnet central (bouchon doré) ── */}
          {/* Socle sombre */}
          <circle cx="100" cy="100" r="20" fill="#0d0d1e" stroke="rgba(0,0,0,0.9)" strokeWidth="2.5"/>
          {/* Corps doré sphérique */}
          <circle cx="100" cy="100" r="17" fill="url(#cochonnet)"/>
          {/* Reflet brillant */}
          <ellipse cx="95.5" cy="94.5" rx="5.5" ry="3.8" fill="rgba(255,255,255,0.6)"/>
          {/* Vis centrale gravée */}
          <circle cx="100" cy="100" r="4.5" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.7"/>
          <line x1="97.8" y1="100" x2="102.2" y2="100" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7"/>
          <line x1="100" y1="97.8" x2="100" y2="102.2" stroke="rgba(255,255,255,0.35)" strokeWidth="0.7"/>
        </svg>
      </motion.div>

      {/* Badge résultat */}
      {landed && !isSpinning && (
        <motion.div
          className="roulette-result-badge"
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 16 }}
        >
          Case {targetIndex + 1}
        </motion.div>
      )}
    </div>
  );
}
