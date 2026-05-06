// Mini-roulette statique pour la boutique / le profil — sans animation, juste les couleurs.
const SLICE_COUNT = 8;
const SLICE_ANGLE = 360 / SLICE_COUNT;

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

export default function RoulettePreview({ palette = [], size = 140 }) {
  const metals = palette.length === SLICE_COUNT ? palette : Array.from({ length: 8 }, () => ({ base: '#3d6080' }));
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <radialGradient id="prv-sheen" cx="72" cy="52" r="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.03)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.42)" />
        </radialGradient>
        <radialGradient id="prv-chrome" cx="50%" cy="50%" r="50%">
          <stop offset="86%" stopColor="#141422" />
          <stop offset="91%" stopColor="#5a5a7a" />
          <stop offset="95%" stopColor="#c0c0d8" />
          <stop offset="98%" stopColor="#e8e8f8" />
          <stop offset="100%" stopColor="#3a3a5a" />
        </radialGradient>
        <radialGradient id="prv-cochonnet" cx="36%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#fff8d0" />
          <stop offset="55%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="#5a3c08" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="99.5" fill="url(#prv-chrome)" />
      {metals.map((m, i) => {
        const start = i * SLICE_ANGLE;
        const end = start + SLICE_ANGLE;
        const path = arcPath(100, 100, 94, start, end);
        return (
          <g key={i}>
            <path d={path} fill={m.base} />
            <path d={path} fill="url(#prv-sheen)" opacity={0.85} />
          </g>
        );
      })}
      <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="20" fill="#0d0d1e" />
      <circle cx="100" cy="100" r="17" fill="url(#prv-cochonnet)" />
    </svg>
  );
}
