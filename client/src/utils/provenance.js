// Badge de provenance dérivé du code postal — l'ADN marseillais du profil.
// 4 zones : Marseille intra-muros (16 arrondissements), Le Pays (PACA proche),
// Le Parisien (région parisienne, cible du Radar), Le Nord (tout le reste).

// Marseille : 13001 → 13016, chaque arrondissement a son quartier + monument (iconName).
const MARSEILLE = {
  '13001': { iconName: 'arr-13001', label: '1ᵉʳ · Vieux-Port', title: 'Le cœur de la ville' },
  '13002': { iconName: 'arr-13002', label: '2ᵉ · Le Panier', title: 'Le plus vieux quartier de France' },
  '13003': { iconName: 'arr-13003', label: '3ᵉ · Belle de Mai', title: 'La Friche et le populaire' },
  '13004': { iconName: 'arr-13004', label: '4ᵉ · La Blancarde', title: 'Les Chartreux' },
  '13005': { iconName: 'arr-13005', label: '5ᵉ · La Plaine', title: 'Là où la nuit ne dort jamais' },
  '13006': { iconName: 'arr-13006', label: '6ᵉ · Castellane', title: 'Notre-Dame-du-Mont' },
  '13007': { iconName: 'arr-13007', label: '7ᵉ · Endoume', title: 'Le Vallon des Auffes, le Pharo' },
  '13008': { iconName: 'arr-13008', label: '8ᵉ · Le Prado', title: 'Le Vélodrome, allez l\'OM !' },
  '13009': { iconName: 'arr-13009', label: '9ᵉ · Les Calanques', title: 'Mazargues, Luminy' },
  '13010': { iconName: 'arr-13010', label: '10ᵉ · Saint-Loup', title: 'La Capelette' },
  '13011': { iconName: 'arr-13011', label: '11ᵉ · La Valentine', title: 'Saint-Marcel, la garrigue' },
  '13012': { iconName: 'arr-13012', label: '12ᵉ · Saint-Barth', title: 'Saint-Barnabé, le quartier chic' },
  '13013': { iconName: 'arr-13013', label: '13ᵉ · Château-Gombert', title: 'Les traditions provençales' },
  '13014': { iconName: 'arr-13014', label: '14ᵉ · Sainte-Marthe', title: 'Le Merlan, les quartiers Nord' },
  '13015': { iconName: 'arr-13015', label: '15ᵉ · Les Aygalades', title: 'Saint-Antoine, la cascade' },
  '13016': { iconName: 'arr-13016', label: '16ᵉ · L\'Estaque', title: 'Les pêcheurs, les chichis' },
};

// Départements du "Pays" (PACA + arc méditerranéen) — pas de moquerie, c'est la famille.
const PAYS_DEPTS = new Set(['13', '83', '84', '04', '05', '06', '30', '34', '11', '66']);

// Région parisienne — la cible.
const PARIS_DEPTS = new Set(['75', '77', '78', '91', '92', '93', '94', '95']);

export function isParisien(postalCode) {
  if (!postalCode || !/^\d{5}$/.test(postalCode)) return false;
  return PARIS_DEPTS.has(postalCode.slice(0, 2));
}

// Retourne le badge de provenance, ou null si pas de code postal valide.
export function getProvenance(postalCode) {
  if (!postalCode || !/^\d{5}$/.test(postalCode)) return null;

  // Marseille intra-muros
  if (MARSEILLE[postalCode]) {
    return { zone: 'marseille', ...MARSEILLE[postalCode] };
  }

  const dept = postalCode.slice(0, 2);

  // Région parisienne
  if (PARIS_DEPTS.has(dept)) {
    return {
      zone: 'paris',
      iconName: 'paris',
      label: 'Parisien démasqué',
      title: 'Attention, un Parisien parmi nous',
    };
  }

  // Aix-en-Provence : le voisin chic (chambrage gentil)
  if (postalCode.startsWith('131')) {
    return {
      zone: 'pays',
      iconName: 'pays',
      label: 'Aix · le voisin chic',
      title: 'Presque marseillais, mais en plus propre',
    };
  }

  // Le Pays (PACA proche)
  if (PAYS_DEPTS.has(dept)) {
    return {
      zone: 'pays',
      iconName: 'pays',
      label: 'Du Pays',
      title: 'Le soleil dans le sang',
    };
  }

  // Tout le reste = le Nord (au-dessus d'Aix, c'est le Nord)
  return {
    zone: 'nord',
    iconName: 'nord',
    label: 'Le Nord',
    title: 'Ramène une petite laine, té',
  };
}

// Badge pour les joueurs anonymes en salon (pas de compte → pas de code postal).
export const PIRATE_PROVENANCE = {
  zone: 'pirate',
  iconName: 'pirate',
  label: 'Pirate',
  title: 'Un loup de mer sans papiers',
};
