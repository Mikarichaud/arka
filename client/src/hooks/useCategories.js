import { useEffect, useState } from 'react';
import api from '../services/api';

let cache = null;
let inflight = null;
const subscribers = new Set();

function notify() {
  for (const cb of subscribers) cb(cache);
}

async function fetchOnce() {
  if (cache) return cache;
  if (!inflight) {
    inflight = api.get('/categories')
      .then(({ data }) => {
        cache = data.categories || [];
        notify();
        return cache;
      })
      .catch(() => {
        cache = [];
        notify();
        return cache;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

// Permet à Editor (création de nouvelle catégorie) de réinitialiser le cache
export function invalidateCategories() {
  cache = null;
  fetchOnce();
}

export function useCategories() {
  const [categories, setCategories] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let mounted = true;
    const cb = (c) => mounted && setCategories(c || []);
    subscribers.add(cb);
    if (cache) {
      setLoading(false);
    } else {
      fetchOnce().then(() => mounted && setLoading(false));
    }
    return () => { mounted = false; subscribers.delete(cb); };
  }, []);

  return { categories, loading };
}
