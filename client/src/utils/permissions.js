// Helpers de permissions partagés côté client.
// Doit rester aligné avec User.isPremiumActive() côté serveur (server/src/models/User.js)
// — les Gatés ont automatiquement l'équivalent Premium.

// Mode lancement : si VITE_FEATURES_UNLOCKED=true au build, toutes les features Premium
// sont ouvertes à tout le monde (Free + anonymes inclus). Flag aussi consommé par les UI
// pour masquer les pages /premium, PaywallModal, banners upsell, badges, etc.
// Doit rester aligné avec FEATURES_UNLOCKED côté serveur.
export const FEATURES_UNLOCKED = import.meta.env.VITE_FEATURES_UNLOCKED === 'true';

export function isGate(user) {
  return user?.role === 'gate';
}

// True si l'user a accès aux features Premium :
// - mode lancement : toujours true (même anonyme)
// - soit tier === 'premium' (abonnement actif)
// - soit role === 'gate' (admin du site, accès illimité)
//
// À utiliser PARTOUT à la place de `user?.tier === 'premium'` pour les checks
// d'accès aux fonctionnalités (création de packs >1, création de salon, upload
// médias/avatar, etc.). Pour distinguer un VRAI abonné Premium (affichage badge
// abonnement, page /profile section abonnement), utilise `user?.tier === 'premium'`
// explicitement — mais ces UI sont masquées en mode lancement de toute façon.
export function hasPremiumAccess(user) {
  if (FEATURES_UNLOCKED) return true;
  return user?.tier === 'premium' || user?.role === 'gate';
}
