import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../Icon/Icon';
import { fumigenesVariants } from '../../styles/motion';
import { useEscapeClose } from '../../hooks/useEscapeClose';
import './RadarParisiens.css';

const COMPOSED_PATTERNS = [/^Jean-/i, /^Marie-/i, /^Pierre-/i, /^Anne-/i, /^Paul-/i, /^Louis-/i];

const BOURGEOIS_NAMES = [
  'Charles', 'Édouard', 'Edouard', 'Eustache', 'Anatole', 'Hubert', 'Augustin',
  'Côme', 'Come', 'Tristan', 'Aurélien', 'Aurelien', 'Thibault', 'Thibaut',
  'Hippolyte', 'Octave', 'Gaspard', 'Léopold', 'Leopold', 'Achille', 'Maximilien',
  'Geoffroy', 'Foucauld', 'Henri', 'Arthur', 'Alexandre',
  'Constance', 'Capucine', 'Alix', 'Garance', 'Eulalie', 'Apolline', 'Domitille',
  'Sixtine', 'Marguerite', 'Joséphine', 'Josephine', 'Pénélope', 'Penelope',
  'Ségolène', 'Segolene', 'Bérengère', 'Berengere', 'Inès', 'Ines', 'Héloïse', 'Heloise',
];
const BOURGEOIS_PATTERN = new RegExp(`\\b(${BOURGEOIS_NAMES.join('|')})\\b`, 'i');

const PARTICLE_PATTERN = /\s(de|du|de la|de l'|d')\s/i;

const MIN_ATTEMPTS_FOR_PERF = 4;
const PERF_THRESHOLD = 0.25;

const NO_PARIS_MESSAGES = [
  "C'est bon, y'en a pas ici, on est entre nous.",
  "Zone sécurisée. Aucun Parisien détecté.",
  "Scan terminé. 0 touriste. 100% Marseille.",
];

function detectReasons(player, history) {
  const reasons = [];
  const name = player.name || '';

  if (COMPOSED_PATTERNS.some((p) => p.test(name))) reasons.push('Prénom à rallonge');
  if (BOURGEOIS_PATTERN.test(name)) reasons.push('Sent le 16ème');
  if (PARTICLE_PATTERN.test(name)) reasons.push('Encore un plus de 10');

  const playerEntries = history.filter((h) => h.playerName === name);
  if (playerEntries.length >= MIN_ATTEMPTS_FOR_PERF) {
    const completed = playerEntries.filter((h) => h.result === 'completed').length;
    const ratio = completed / playerEntries.length;
    if (ratio < PERF_THRESHOLD) reasons.push('Plus mou qu\'une panisse');
  }

  return reasons;
}

export default function RadarParisiens({ players = [], history = [] }) {
  const detected = useMemo(
    () =>
      players
        .map((p) => ({ player: p, reasons: detectReasons(p, history) }))
        .filter((d) => d.reasons.length > 0),
    [players, history]
  );

  const [visible, setVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [reveal, setReveal] = useState(false);

  if (detected.length === 0) return null;

  const handleClick = () => {
    setVisible(true);
    setScanning(true);
    setReveal(false);
    setTimeout(() => {
      setScanning(false);
      setReveal(true);
    }, 1400);
  };

  const close = () => {
    if (scanning) return;
    setVisible(false);
  };

  useEscapeClose(visible, close);

  return (
    <>
      <motion.button
        key="radar-btn"
        className="radar-btn"
        onClick={handleClick}
        title="Radar à Parisiens"
        aria-label="Radar à Parisiens"
        initial={{ scale: 0, rotate: -90, opacity: 0 }}
        animate={{
          scale: 1,
          rotate: 0,
          opacity: 1,
          transition: { type: 'spring', stiffness: 300, damping: 14 },
        }}
      >
        <span className="radar-btn-pulse" />
        <Icon name="radar" size={18} />
        {detected.length > 1 && (
          <span className="radar-btn-badge">{detected.length}</span>
        )}
      </motion.button>

      <AnimatePresence>
        {visible && (
          <motion.div
            className="radar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              className="radar-modal radar-modal--alert"
              variants={fumigenesVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="radar-title">
                <Icon name="radar" size={22} style={{ marginRight: 8 }} />
                Radar à Parisiens
              </h3>

              {scanning ? (
                <div className="radar-scanning">
                  <div className="radar-sonar">
                    <motion.div
                      className="radar-sweep"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                  <p>Scan en cours...</p>
                </div>
              ) : reveal ? (
                <motion.div
                  className="radar-detected"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p className="radar-alert">
                    ⚠️ {detected.length > 1 ? `${detected.length} suspects détectés` : 'Suspect détecté'} !
                  </p>
                  <ul className="radar-detected-list">
                    {detected.map(({ player, reasons }) => (
                      <li key={player.name}>
                        <span className="radar-detected-name">{player.name}</span>
                        <span className="radar-detected-reasons">
                          {reasons.join(' · ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="radar-detected-msg">Té, faites attention à vos affaires.</p>
                </motion.div>
              ) : (
                <p className="radar-result">
                  {NO_PARIS_MESSAGES[0]}
                </p>
              )}

              {!scanning && (
                <button className="btn btn-primary btn-sm" onClick={close}>
                  On les a à l'œil...
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
