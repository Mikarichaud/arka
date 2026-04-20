import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './Roulette.css';

const SLICE_COUNT = 8;
const SLICE_ANGLE = 360 / SLICE_COUNT;

const SLICE_COLORS = [
  '#0057A8', '#C9A84C', '#E63946', '#2DC653',
  '#003d7a', '#b8943c', '#c42d39', '#25a847',
];

export default function Roulette({ challenges = [], targetIndex, isSpinning, onSpinEnd }) {
  const controls = useAnimation();
  const currentRotation = useRef(0);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!isSpinning || targetIndex === null || targetIndex === undefined) return;

    setLanded(false);

    // Orientation visuelle cible (là où le disque DOIT finir, depuis 0°)
    const targetAngle = targetIndex * SLICE_ANGLE + SLICE_ANGLE / 2;
    const targetOrientation = (360 - targetAngle) % 360;

    // Delta depuis la position visuelle actuelle
    const currentVisual = currentRotation.current % 360;
    let delta = (targetOrientation - currentVisual + 360) % 360;
    // Si delta trop petit, ajouter un tour pour ne pas freiner brusquement
    if (delta < 15) delta += 360;

    const fullSpins = 6 * 360;
    const finalAngle = currentRotation.current + fullSpins + delta;

    controls.start({
      rotate: finalAngle,
      transition: {
        duration: 4,
        ease: [0.08, 0.6, 0.12, 1.0],
      },
    }).then(() => {
      // Garder la valeur absolue — PAS de modulo — sinon Framer Motion
      // repart d'une position différente de sa valeur interne et le spin
      // suivant ne fait plus que quelques degrés au lieu de 6 tours.
      currentRotation.current = finalAngle;
      setLanded(true);
      onSpinEnd?.();
    });
  }, [isSpinning, targetIndex]);

  const slices = Array.from({ length: SLICE_COUNT }, (_, i) => {
    const startAngle = i * SLICE_ANGLE;
    const challenge = challenges[i];
    const intensity = challenge?.intensity?.color;
    return { startAngle, challenge, color: intensity || SLICE_COLORS[i] };
  });

  return (
    <div className={`roulette-wrapper ${isSpinning ? 'is-spinning' : ''} ${landed ? 'has-landed' : ''}`}>

      {/* Lueur externe pendant le spin */}
      {isSpinning && (
        <div className="roulette-glow-ring" />
      )}

      {/* Aiguille */}
      <div className={`roulette-needle ${isSpinning ? 'vibrating' : ''}`} />

      <motion.div className="roulette-disc" animate={controls}>
        <svg viewBox="0 0 200 200" className="roulette-svg">
          <defs>
            <filter id="slice-shadow">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="rgba(0,0,0,0.3)" />
            </filter>
          </defs>

          {slices.map((slice, i) => {
            const startRad = ((slice.startAngle - 90) * Math.PI) / 180;
            const endRad = ((slice.startAngle + SLICE_ANGLE - 90) * Math.PI) / 180;
            const x1 = 100 + 96 * Math.cos(startRad);
            const y1 = 100 + 96 * Math.sin(startRad);
            const x2 = 100 + 96 * Math.cos(endRad);
            const y2 = 100 + 96 * Math.sin(endRad);
            const midRad = ((slice.startAngle + SLICE_ANGLE / 2 - 90) * Math.PI) / 180;
            const tx = 100 + 68 * Math.cos(midRad);
            const ty = 100 + 68 * Math.sin(midRad);
            const isWinner = landed && targetIndex === i;

            return (
              <g key={i}>
                <path
                  d={`M100,100 L${x1},${y1} A96,96 0 0,1 ${x2},${y2} Z`}
                  fill={slice.color}
                  stroke="white"
                  strokeWidth="1.5"
                  opacity={isWinner ? 1 : 0.88}
                  filter={isWinner ? 'url(#slice-shadow)' : undefined}
                />
                {/* Numéro de case */}
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="11"
                  fontFamily="Bebas Neue, Impact, sans-serif"
                  fontWeight="700"
                  opacity="0.9"
                  transform={`rotate(${slice.startAngle + SLICE_ANGLE / 2}, ${tx}, ${ty})`}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {i + 1}
                </text>
                {/* Libellé court du défi */}
                {slice.challenge && (
                  <text
                    x={100 + 44 * Math.cos(midRad)}
                    y={100 + 44 * Math.sin(midRad)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.75)"
                    fontSize="4.5"
                    fontFamily="Nunito, sans-serif"
                    fontWeight="600"
                    transform={`rotate(${slice.startAngle + SLICE_ANGLE / 2}, ${100 + 44 * Math.cos(midRad)}, ${100 + 44 * Math.sin(midRad)})`}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {slice.challenge.text?.slice(0, 14)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Séparateurs lumineux */}
          {slices.map((slice, i) => {
            const rad = ((slice.startAngle - 90) * Math.PI) / 180;
            return (
              <line
                key={`sep-${i}`}
                x1="100" y1="100"
                x2={100 + 96 * Math.cos(rad)}
                y2={100 + 96 * Math.sin(rad)}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="0.8"
              />
            );
          })}

          {/* Centre — boulon doré */}
          <circle cx="100" cy="100" r="15" fill="#1a1a2e" stroke={isSpinning ? '#C9A84C' : 'white'} strokeWidth="3" />
          <circle cx="100" cy="100" r="9" fill="#C9A84C" />
          <circle cx="100" cy="100" r="4" fill="#1a1a2e" />
        </svg>
      </motion.div>

      {/* Badge résultat */}
      {landed && !isSpinning && (
        <motion.div
          className="roulette-result-badge"
          initial={{ opacity: 0, scale: 0.6, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
        >
          Case {targetIndex + 1}
        </motion.div>
      )}
    </div>
  );
}
