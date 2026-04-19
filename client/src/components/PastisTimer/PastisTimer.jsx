import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './PastisTimer.css';

export default function PastisTimer({ duration = 30, onExpire, running = false }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration, running]);

  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) { onExpire?.(); return; }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [running, timeLeft]);

  const pct = timeLeft / duration;

  return (
    <div className="pastis-wrapper">
      <div className="pastis-glass">
        <motion.div
          className="pastis-liquid"
          animate={{ height: `${pct * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ backgroundColor: pct > 0.4 ? '#f0c040' : '#e88020' }}
        />
        <div className="pastis-bubbles">
          {pct > 0 && [0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="bubble"
              animate={{ y: [0, -20], opacity: [0.6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>
        <span className="pastis-time">{timeLeft}s</span>
      </div>
      {timeLeft <= 0 && (
        <p className="pastis-expired">C'est fini, oh fada !</p>
      )}
    </div>
  );
}
