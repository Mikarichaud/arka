import { Helmet } from 'react-helmet-async';

// Domaine canonique de prod. Si tu changes de domaine, c'est ici (utilisé pour
// les URLs absolues OG/Twitter + canonical).
const SITE_URL = 'https://arka.michaelrichaud.fr';
// TODO: créer une vraie OG image 1200x630 (preview WhatsApp/iMessage parfait).
// Pour l'instant on utilise l'icône PWA 512x512 — acceptée par tous les crawlers
// mais aspect carré → coupée en bandeau sur certaines plateformes.
const DEFAULT_OG_IMAGE = `${SITE_URL}/pwa-512x512.png`;
const SITE_NAME = 'La Roulade Marseillaise';

/**
 * Meta tags + Open Graph + Twitter Cards centralisés.
 *
 * Usage minimal :
 *   <SEO title="Premium" description="Passe en Premium..." path="/premium" />
 *
 * Le titre est automatiquement suffixé par " · La Roulade Marseillaise" sauf si
 * `titleAsIs` est passé. La description doit faire 100-160 chars pour un bon SERP.
 *
 * Pour les JSON-LD plus riches (Game, Event, etc.), passe `jsonLd={[...]}` :
 *   <SEO ... jsonLd={[{ "@type": "WebApplication", "@context": "https://schema.org", ... }]} />
 */
export default function SEO({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  ogType = 'website',
  titleAsIs = false,
  jsonLd = [],
  noindex = false,
}) {
  const fullTitle = titleAsIs ? title : (title ? `${title} · ${SITE_NAME}` : SITE_NAME);
  const canonical = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const absImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  return (
    <Helmet>
      <html lang="fr" />
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph (Facebook / WhatsApp / iMessage / Insta preview) */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={absImage} />
      <meta property="og:locale" content="fr_FR" />

      {/* Twitter Cards (preview Twitter / X) */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={absImage} />

      {/* JSON-LD structured data — facultatif, pour rich snippets Google */}
      {jsonLd.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}

export { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE };
