import { Capacitor } from '@capacitor/core';

// Clé publique RevenueCat iOS (injectée au build natif). Sans elle → IAP désactivé.
const KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY;

// L'achat in-app n'est dispo que dans l'app iOS native ET si la clé est configurée.
// Sur le web, on passe par Stripe (cf. PermisHome).
export const iapAvailable = () => {
  try { return Capacitor.getPlatform() === 'ios' && Boolean(KEY); }
  catch { return false; }
};

let configured = false;
async function getPurchases() {
  const mod = await import('@revenuecat/purchases-capacitor');
  return mod.Purchases;
}

// Configure le SDK + associe l'achat à NOTRE userId (→ app_user_id du webhook = notre User._id).
async function ensureReady(userId) {
  const Purchases = await getPurchases();
  if (!configured) { await Purchases.configure({ apiKey: KEY }); configured = true; }
  if (userId) { try { await Purchases.logIn({ appUserID: String(userId) }); } catch { /* non bloquant */ } }
  return Purchases;
}

// Lance l'achat du lot « 3 essais ». Le crédit des essais arrive ensuite côté serveur
// via le webhook RevenueCat → le client doit re-fetch /permis/status après.
// Throw avec { userCancelled: true } si l'utilisateur annule.
export async function purchasePasseport(userId) {
  const Purchases = await ensureReady(userId);
  const offerings = await Purchases.getOfferings();
  const pkg = offerings?.current?.availablePackages?.[0];
  if (!pkg) throw new Error('NO_OFFERING');
  await Purchases.purchasePackage({ aPackage: pkg });
}
