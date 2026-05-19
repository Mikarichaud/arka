// Helpers de permissions partagés côté client.
// Doit rester aligné avec User.isPremiumActive() côté serveur (server/src/models/User.js)
// — les Gatés ont automatiquement l'équivalent Premium.

export function isGate(user) {
  return user?.role === 'gate';
}

// True si l'user a accès aux features Premium :
// - soit tier === 'premium' (abonnement actif)
// - soit role === 'gate' (admin du site, accès illimité)
//
// À utiliser PARTOUT à la place de `user?.tier === 'premium'` pour les checks
// d'accès aux fonctionnalités (création de packs >1, création de salon, upload
// médias/avatar, etc.). Pour distinguer un VRAI abonné Premium (affichage badge
// abonnement, page /profile section abonnement), utilise `user?.tier === 'premium'`
// explicitement.
export function hasPremiumAccess(user) {
  return user?.tier === 'premium' || user?.role === 'gate';
}
