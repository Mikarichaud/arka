import { useEffect } from 'react';

// Verrouille le scroll du body tant qu'une modale est ouverte (anti scroll de fond /
// overscroll iOS). Compteur partagé → plusieurs modales empilées ne se débloquent
// pas prématurément.
let lockCount = 0;

export function useBodyScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return undefined;
    lockCount += 1;
    document.body.classList.add('scroll-locked');
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.classList.remove('scroll-locked');
    };
  }, [isOpen]);
}
