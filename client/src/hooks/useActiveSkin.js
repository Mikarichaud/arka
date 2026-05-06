import { useEffect, useState } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

// Cache module-level des cosmétiques (slug → cosmetic doc).
let cache = null;
let inflight = null;

async function fetchAll() {
  if (cache) return cache;
  if (!inflight) {
    inflight = api.get('/cosmetics')
      .then(({ data }) => {
        cache = {};
        for (const c of (data.cosmetics || [])) cache[c.slug] = c;
        return cache;
      })
      .catch(() => { cache = {}; return cache; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function invalidateCosmetics() {
  cache = null;
}

// Renvoie le cosmetic actif pour une catégorie donnée pour l'utilisateur courant,
// ou null s'il n'en a pas.
export function useActiveSkin(category) {
  const user = useAuthStore((s) => s.user);
  const activeSlug = user?.activeSkins?.[category] || null;
  const [cosmetic, setCosmetic] = useState(activeSlug && cache?.[activeSlug] ? cache[activeSlug] : null);

  useEffect(() => {
    if (!activeSlug) { setCosmetic(null); return; }
    let mounted = true;
    fetchAll().then((all) => {
      if (mounted) setCosmetic(all[activeSlug] || null);
    });
    return () => { mounted = false; };
  }, [activeSlug]);

  return cosmetic;
}
