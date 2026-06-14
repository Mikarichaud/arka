// Provenance dérivée du code postal — version serveur (miroir de client/src/utils/provenance.js).
// Utilisée par le Permis Marseillais pour le twist de mention (parisien / marseillais).

const PAYS_DEPTS = new Set(['13', '83', '84', '04', '05', '06', '30', '34', '11', '66']);
const PARIS_DEPTS = new Set(['75', '77', '78', '91', '92', '93', '94', '95']);

function isParisien(postalCode) {
  if (!postalCode || !/^\d{5}$/.test(postalCode)) return false;
  return PARIS_DEPTS.has(postalCode.slice(0, 2));
}

// Retourne { zone } parmi marseille / paris / pays / nord, ou null si CP invalide.
function getProvenance(postalCode) {
  if (!postalCode || !/^\d{5}$/.test(postalCode)) return null;

  const n = parseInt(postalCode, 10);
  if (n >= 13001 && n <= 13016) return { zone: 'marseille' };

  const dept = postalCode.slice(0, 2);
  if (PARIS_DEPTS.has(dept)) return { zone: 'paris' };
  if (postalCode.startsWith('131')) return { zone: 'pays' };
  if (PAYS_DEPTS.has(dept)) return { zone: 'pays' };
  return { zone: 'nord' };
}

module.exports = { getProvenance, isParisien };
