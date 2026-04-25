export const fumigenesVariants = {
  initial: { opacity: 0, scale: 0.88, filter: 'blur(8px)', y: 20 },
  animate: {
    opacity: 1, scale: 1, filter: 'blur(0px)', y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 22 },
  },
  exit: {
    opacity: 0, scale: 0.92, filter: 'blur(6px)', y: -10,
    transition: { duration: 0.2 },
  },
};

export const fumigenesSoft = {
  initial: { opacity: 0, filter: 'blur(6px)', y: 8 },
  animate: {
    opacity: 1, filter: 'blur(0px)', y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 26 },
  },
  exit: { opacity: 0, filter: 'blur(4px)', y: -6, transition: { duration: 0.18 } },
};
