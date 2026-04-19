import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import './Roulette.css';

const SLICE_COUNT = 8;
const SLICE_ANGLE = 360 / SLICE_COUNT;

const SLICE_COLORS = [
  '#0057A8', '#C9A84C', '#E63946', '#2DC653',
  '#0057A8', '#C9A84C', '#E63946', '#2DC653',
];

export default function Roulette({ challenges = [], targetIndex, isSpinning, onSpinEnd }) {
  const controls = useAnimation();
  const currentRotation = useRef(0);
  const [displayIndex, setDisplayIndex] = useState(null);

  useEffect(() => {
    if (!isSpinning || targetIndex === null || targetIndex === undefined) return;

    // L'aiguille est en haut (0°). Case 0 commence à -SLICE_ANGLE/2.
    // Pour que la case targetIndex soit sous l'aiguille :
    const targetAngle = targetIndex * SLICE_ANGLE + SLICE_ANGLE / 2;
    const normalizedTarget = (360 - targetAngle) % 360;
    const fullSpins = 5 * 360;
    const finalAngle = currentRotation.current + fullSpins + normalizedTarget;

    controls.start({
      rotate: finalAngle,
      transition: {
        duration: 4,
        ease: [0.17, 0.67, 0.12, 0.99],
      },
    }).then(() => {
      currentRotation.current = finalAngle % 360;
      setDisplayIndex(targetIndex);
      onSpinEnd?.();
    });
  }, [isSpinning, targetIndex]);

  const slices = Array.from({ length: SLICE_COUNT }, (_, i) => {
    const startAngle = i * SLICE_ANGLE;
    const challenge = challenges[i];
    const intensity = challenge?.intensity?.color || SLICE_COLORS[i];
    return { startAngle, challenge, color: intensity || SLICE_COLORS[i] };
  });

  return (
    <div className="roulette-wrapper">
      {/* Aiguille */}
      <div className="roulette-needle" />

      <motion.div className="roulette-disc" animate={controls}>
        <svg viewBox="0 0 200 200" className="roulette-svg">
          {slices.map((slice, i) => {
            const startRad = ((slice.startAngle - 90) * Math.PI) / 180;
            const endRad = ((slice.startAngle + SLICE_ANGLE - 90) * Math.PI) / 180;
            const x1 = 100 + 95 * Math.cos(startRad);
            const y1 = 100 + 95 * Math.sin(startRad);
            const x2 = 100 + 95 * Math.cos(endRad);
            const y2 = 100 + 95 * Math.sin(endRad);
            const midRad = ((slice.startAngle + SLICE_ANGLE / 2 - 90) * Math.PI) / 180;
            const tx = 100 + 62 * Math.cos(midRad);
            const ty = 100 + 62 * Math.sin(midRad);

            return (
              <g key={i}>
                <path
                  d={`M100,100 L${x1},${y1} A95,95 0 0,1 ${x2},${y2} Z`}
                  fill={slice.color}
                  stroke="white"
                  strokeWidth="1.5"
                  opacity={displayIndex === i ? 1 : 0.85}
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="8"
                  fontFamily="Nunito, sans-serif"
                  fontWeight="800"
                  transform={`rotate(${slice.startAngle + SLICE_ANGLE / 2}, ${tx}, ${ty})`}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
          {/* Centre */}
          <circle cx="100" cy="100" r="14" fill="white" stroke="#0057A8" strokeWidth="3" />
          <circle cx="100" cy="100" r="6" fill="#C9A84C" />
        </svg>
      </motion.div>

      {displayIndex !== null && !isSpinning && (
        <div className="roulette-result-badge">
          Case {displayIndex + 1}
        </div>
      )}
    </div>
  );
}
