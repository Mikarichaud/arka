import { motion } from 'framer-motion';
import { useNavDirection } from '../../App';
import './Layout.css';

const pageVariants = {
  initial: (dir) => ({
    x: `${dir * 55}%`,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'tween',
      ease: [0.25, 0.46, 0.45, 0.94],
      duration: 0.38,
    },
  },
  exit: (dir) => ({
    x: `${-dir * 35}%`,
    opacity: 0,
    transition: {
      type: 'tween',
      ease: [0.25, 0.46, 0.45, 0.94],
      duration: 0.28,
    },
  }),
};

export default function Layout({ children, className = '' }) {
  const direction = useNavDirection();

  return (
    <motion.div
      className={`layout-page ${className}`}
      custom={direction}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
