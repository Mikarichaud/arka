// Stockage des credentials de salon en localStorage, scopé par code.
// Permet la réconnexion automatique après refresh / fermeture d'onglet.

const KEY_PREFIX = 'arka-salon-';

export function saveSalonCreds(code, { playerId, connectionToken, pseudo }) {
  try {
    localStorage.setItem(
      `${KEY_PREFIX}${code}`,
      JSON.stringify({ playerId, connectionToken, pseudo, savedAt: Date.now() }),
    );
  } catch {
    // Quota plein ou storage indispo : on continue sans persistance.
  }
}

export function loadSalonCreds(code) {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${code}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.connectionToken || !data?.playerId) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSalonCreds(code) {
  try {
    localStorage.removeItem(`${KEY_PREFIX}${code}`);
  } catch { /* noop */ }
}

// Liste de tous les salons mémorisés (utile pour un futur écran "mes salons récents")
export function listSavedSalonCodes() {
  const codes = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY_PREFIX)) codes.push(k.slice(KEY_PREFIX.length));
    }
  } catch { /* noop */ }
  return codes;
}
