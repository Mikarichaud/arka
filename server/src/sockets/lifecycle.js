const Salon = require('../models/Salon');

// Recovery au boot : audit des salons non-ended.
// On ne purge personne ici, on log juste pour visibilité. La state machine
// en mémoire (activeSockets) sera reconstruite naturellement par les `salon:join`
// au fil des reconnexions des clients (qui gardent leur connectionToken en localStorage).
async function recoverActiveSalons() {
  try {
    const count = await Salon.countDocuments({ status: { $ne: 'ended' } });
    console.log(`[salons] ${count} salon(s) actif(s) au boot serveur.`);
  } catch (err) {
    console.error('[salons] recovery échouée', err);
  }
}

// Cleanup TTL : passe les salons inactifs depuis > 2h en `ended`.
async function cleanupInactiveSalons() {
  try {
    const cutoff = new Date(Date.now() - Salon.INACTIVITY_MS);
    const result = await Salon.updateMany(
      { status: { $ne: 'ended' }, lastActivityAt: { $lt: cutoff } },
      { $set: { status: 'ended' } },
    );
    if (result.modifiedCount > 0) {
      console.log(`[salons] cleanup : ${result.modifiedCount} salon(s) passé(s) en 'ended' pour inactivité.`);
    }
  } catch (err) {
    console.error('[salons] cleanup échoué', err);
  }
}

let cleanupInterval = null;

function startLifecycle() {
  recoverActiveSalons();
  // Tick toutes les 5 minutes
  cleanupInterval = setInterval(cleanupInactiveSalons, 5 * 60 * 1000);
}

function stopLifecycle() {
  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = null;
}

module.exports = { startLifecycle, stopLifecycle, recoverActiveSalons, cleanupInactiveSalons };
