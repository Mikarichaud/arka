// Rendu serveur du diplôme « Permis Marseillais » en PNG.
// satori (layout flex → SVG) + @resvg/resvg-js (SVG → PNG). Sert l'image de
// téléchargement (paysage/portrait) ET l'image OG de partage social.
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Resvg } = require('@resvg/resvg-js');
const { getProvenance } = require('../utils/provenance');

const SITE = process.env.CLIENT_URL || 'https://roulademarseillaise.fr';

// --- Polices (woff, compatibles satori — pas de woff2) ---
const fontDir = (pkg, file) => path.join(__dirname, '../../node_modules/@fontsource', pkg, 'files', file);
const FONTS = [
  { name: 'Bebas Neue', weight: 400, style: 'normal', data: fs.readFileSync(fontDir('bebas-neue', 'bebas-neue-latin-400-normal.woff')) },
  { name: 'Nunito', weight: 400, style: 'normal', data: fs.readFileSync(fontDir('nunito', 'nunito-latin-400-normal.woff')) },
  { name: 'Nunito', weight: 800, style: 'normal', data: fs.readFileSync(fontDir('nunito', 'nunito-latin-800-normal.woff')) },
  { name: 'Pinyon Script', weight: 400, style: 'normal', data: fs.readFileSync(fontDir('pinyon-script', 'pinyon-script-latin-400-normal.woff')) },
];

const BLEU = '#0057A8', BLEU_DARK = '#003d7a', GOLD = '#C9A84C', RED = '#E63946', GREEN = '#2DC653', INK = '#3a3326', SAND = '#8a7b53';

// Blason : cercle bleu + soleil or + ancre blanche.
const CREST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
<circle cx="50" cy="50" r="46" fill="none" stroke="${GOLD}" stroke-width="2.5"/>
<circle cx="50" cy="50" r="40" fill="${BLEU}"/>
<g fill="#e0c070"><circle cx="50" cy="50" r="3"/><g stroke="#e0c070" stroke-width="2"><path d="M50 14v10M50 76v10M14 50h10M76 50h10M25 25l7 7M68 68l7 7M75 25l-7 7M32 68l-7 7"/></g></g>
<path d="M50 32a5 5 0 0 0-2 9.5V46h-5v5h5v18c-7-1-12-6-13-13l4 1-6-7-6 7 4-1c2 9 9 16 19 17 10-1 17-8 19-17l4 1-6-7-6 7 4-1c-1 7-6 12-13 13V51h5v-5h-5v-4.5A5 5 0 0 0 50 32z" fill="#F5F5F0"/></svg>`;
const CREST_URI = `data:image/svg+xml;base64,${Buffer.from(CREST_SVG).toString('base64')}`;

const PRESETS = {
  paysage: { W: 1200, H: 630, pad: 50, crest: 64, title: 60, name: 44, mention: 36, sub: 13, body: 19, auth: 15, stamp: 118, foot: 12, sig: 30, qr: 56 },
  portrait: { W: 840, H: 1180, pad: 64, crest: 92, title: 70, name: 50, mention: 46, sub: 14, body: 21, auth: 16, stamp: 140, foot: 13, sig: 36, qr: 64 },
};

const box = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });
const txt = (content, style = {}) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: String(content) } });
const img = (src, w, h) => ({ type: 'img', props: { src, width: w, height: h, style: { width: w, height: h } } });
const dot = (size = 6, color = GOLD) => box({ width: size, height: size, borderRadius: size, backgroundColor: color });

function provLabel(zone) {
  if (zone === 'marseille') return 'Marseille';
  if (zone === 'paris') return 'Parisien démasqué';
  if (zone === 'pays') return 'Du Pays';
  if (zone === 'nord') return 'Le Nord';
  return 'Sans papiers';
}

function buildDiploma(cert, P, qrUri) {
  const passed = cert.passed;
  const stampColor = passed ? GREEN : RED;
  const mentionColor = passed ? GREEN : RED;
  const zone = getProvenance(cert.postalCode)?.zone || null;
  const dateStr = cert.recordAt
    ? new Date(cert.recordAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return box(
    {
      width: P.W, height: P.H, position: 'relative', flexDirection: 'column',
      backgroundColor: '#fbf6e9',
      backgroundImage: 'radial-gradient(circle at 50% 32%, #ffffff 0%, #fbf6e9 45%, #f3ead2 100%)',
      fontFamily: 'Nunito',
    },
    [
      // cadres dorés
      box({ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, border: `2px solid ${GOLD}`, borderRadius: 6 }, []),
      box({ position: 'absolute', top: 22, left: 22, right: 22, bottom: 22, border: `1px solid ${GOLD}`, opacity: 0.55, borderRadius: 3 }, []),

      // contenu
      box(
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'column', alignItems: 'center', padding: P.pad, paddingTop: P.pad + 4 },
        [
          // autorité
          box({ alignItems: 'center', gap: 12 }, [
            box({ width: 36, height: 1, backgroundColor: GOLD }, []),
            txt('RÉPUBLIQUE MARSEILLAISE · PRÉFECTURE DE LA BONNE MÈRE', { fontFamily: 'Bebas Neue', fontSize: P.auth, color: BLEU, letterSpacing: 2 }),
            box({ width: 36, height: 1, backgroundColor: GOLD }, []),
          ]),
          img(CREST_URI, P.crest, P.crest),
          txt('Passeport Marseillais', { fontFamily: 'Bebas Neue', fontSize: P.title, height: Math.round(P.title * 1.2), lineHeight: 1, alignItems: 'center', justifyContent: 'center', color: BLEU_DARK, letterSpacing: 4, marginTop: 6 }),
          txt('CERTIFICAT OFFICIEL D\'AUTHENTICITÉ MARSEILLAISE', { fontSize: P.sub, color: SAND, fontWeight: 800, letterSpacing: 1, marginTop: 8 }),
          // filet
          box({ alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 12 }, [
            dot(5), box({ width: 150, height: 1, backgroundColor: GOLD }, []), dot(5),
          ]),

          // corps
          box({ flexDirection: 'column', alignItems: 'center', color: INK, fontSize: P.body }, [
            txt(passed ? 'Il est solennellement certifié que' : 'Après examen, la Préfecture déclare que'),
            txt(cert.pseudo, { fontFamily: 'Bebas Neue', fontSize: P.name, color: RED, letterSpacing: 3, marginTop: 8, marginBottom: 8 }),
            box({ backgroundColor: 'rgba(0,87,168,0.10)', border: `1px solid rgba(0,87,168,0.30)`, borderRadius: 30, paddingTop: 3, paddingBottom: 3, paddingLeft: 14, paddingRight: 14 }, [
              txt(provLabel(zone), { fontSize: P.sub + 1, color: BLEU_DARK, fontWeight: 800 }),
            ]),
            txt(passed ? 'a passé l\'épreuve du Passeport Marseillais et obtient la mention' : 's\'est présenté à l\'épreuve avec la mention', { marginTop: 12 }),
            txt(cert.mention, { fontFamily: 'Bebas Neue', fontSize: P.mention, color: mentionColor, letterSpacing: 2, marginTop: 8 }),
            box({ alignItems: 'baseline', gap: 6, marginTop: 6 }, [
              txt('avec la note de', { fontWeight: 800 }),
              txt(String(cert.score), { fontWeight: 800, fontSize: P.body + 6 }),
              txt('/20', { fontWeight: 800 }),
            ]),
          ]),

          // pied
          box({ marginTop: 'auto', width: '100%', justifyContent: 'space-between', alignItems: 'flex-end' }, [
            box({ flexDirection: 'column', color: '#6b6047', fontSize: P.foot }, [
              box({ gap: 6 }, [txt('MATRICULE', { color: SAND, fontWeight: 800 }), txt(cert.publicCode, { fontFamily: 'Bebas Neue', fontSize: P.foot + 5, color: BLEU_DARK, letterSpacing: 2 })]),
              dateStr ? txt(`Délivré le ${dateStr}, sous le mistral`, { marginTop: 4 }) : txt(''),
            ]),
            // tampon
            box({ width: P.stamp, height: P.stamp, borderRadius: P.stamp, border: `3px solid ${stampColor}`, transform: 'rotate(-12deg)', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }, [
              box({ position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, border: `1px solid ${stampColor}`, opacity: 0.6, borderRadius: P.stamp }, []),
              txt(passed ? 'Homologué' : 'Recalé', { fontFamily: 'Bebas Neue', fontSize: P.stamp * 0.2, color: stampColor, letterSpacing: 1 }),
              txt('MASSALIA', { fontSize: P.stamp * 0.08, color: stampColor, letterSpacing: 3, marginTop: 2 }),
            ]),
            box({ flexDirection: 'column', alignItems: 'flex-end', gap: 3 }, [
              img(qrUri, P.qr, P.qr),
              txt('le Préfet', { fontFamily: 'Pinyon Script', fontSize: P.sig, color: BLEU_DARK }),
              txt('LE PRÉFET DE LA BONNE MÈRE', { fontSize: P.foot - 1, color: SAND, fontWeight: 800, letterSpacing: 0.5 }),
            ]),
          ]),
        ]
      ),
    ]
  );
}

async function renderCertificateImage(cert, format = 'paysage') {
  const P = PRESETS[format] || PRESETS.paysage;
  const url = `${SITE}/certificat/${cert.publicCode}`;
  const qrUri = await QRCode.toDataURL(url, { margin: 0, color: { dark: '#0D1117', light: '#0000' } });

  const { default: satori } = await import('satori');
  const svg = await satori(buildDiploma(cert, P, qrUri), { width: P.W, height: P.H, fonts: FONTS });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: P.W } }).render().asPng();
  return png;
}

module.exports = { renderCertificateImage };
