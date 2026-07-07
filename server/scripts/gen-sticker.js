// Génère le sticker bar « Qui régale la prochaine tournée ? » (QR → /tournee).
// Sortie : mockups/sticker-tournee.png (portrait haute résolution, prêt à imprimer).
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Resvg } = require('@resvg/resvg-js');

const BLEU = '#0057A8', BLEU_DARK = '#003d7a', GOLD = '#C9A84C', GOLD_LIGHT = '#e0c070', INK = '#0D1117';
const QR_URL = 'https://roulademarseillaise.fr/tournee?utm_source=sticker&utm_medium=bar';

const fontDir = (pkg, file) => path.join(__dirname, '../node_modules/@fontsource', pkg, 'files', file);
const FONTS = [
  { name: 'Bebas Neue', weight: 400, style: 'normal', data: fs.readFileSync(fontDir('bebas-neue', 'bebas-neue-latin-400-normal.woff')) },
  { name: 'Nunito', weight: 400, style: 'normal', data: fs.readFileSync(fontDir('nunito', 'nunito-latin-400-normal.woff')) },
  { name: 'Nunito', weight: 800, style: 'normal', data: fs.readFileSync(fontDir('nunito', 'nunito-latin-800-normal.woff')) },
];

const CREST = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
<circle cx="50" cy="50" r="46" fill="none" stroke="${GOLD}" stroke-width="3"/>
<circle cx="50" cy="50" r="40" fill="#ffffff"/>
<g fill="${GOLD}"><circle cx="50" cy="50" r="3"/><g stroke="${GOLD}" stroke-width="2"><path d="M50 14v10M50 76v10M14 50h10M76 50h10M25 25l7 7M68 68l7 7M75 25l-7 7M32 68l-7 7"/></g></g>
<path d="M50 32a5 5 0 0 0-2 9.5V46h-5v5h5v18c-7-1-12-6-13-13l4 1-6-7-6 7 4-1c2 9 9 16 19 17 10-1 17-8 19-17l4 1-6-7-6 7 4-1c-1 7-6 12-13 13V51h5v-5h-5v-4.5A5 5 0 0 0 50 32z" fill="${BLEU}"/></svg>`;
const CREST_URI = `data:image/svg+xml;base64,${Buffer.from(CREST).toString('base64')}`;

const box = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });
const txt = (c, style = {}) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: String(c) } });
const img = (src, w, h) => ({ type: 'img', props: { src, width: w, height: h, style: { width: w, height: h } } });

(async () => {
  // Carré 1000×1000 ≈ 360 dpi à 7 cm → impression nette, QR scannable (~3,9 cm).
  const W = 1000, H = 1000;
  const qrUri = await QRCode.toDataURL(QR_URL, { margin: 1, width: 640, color: { dark: INK, light: '#ffffff' } });

  const tree = box(
    { width: W, height: H, position: 'relative', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
      padding: 54, backgroundColor: BLEU,
      backgroundImage: `radial-gradient(circle at 50% 0%, ${BLEU_DARK} 0%, ${BLEU} 65%)`,
      fontFamily: 'Nunito', color: '#ffffff' },
    [
      // Marque + accroche courte
      box({ flexDirection: 'column', alignItems: 'center', gap: 8 }, [
        box({ alignItems: 'center', gap: 10 }, [
          img(CREST_URI, 52, 52),
          txt('LA ROULADE MARSEILLAISE', { fontFamily: 'Bebas Neue', fontSize: 24, letterSpacing: 3, color: GOLD_LIGHT }),
        ]),
        box({ width: 900, justifyContent: 'center' }, [
          txt('QUI RÉGALE LA TOURNÉE ?', { fontFamily: 'Bebas Neue', fontSize: 78, lineHeight: 1, letterSpacing: 2, color: '#ffffff', textAlign: 'center' }),
        ]),
      ]),

      // QR dominant
      box({ flexDirection: 'column', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 24, padding: 22, gap: 8 }, [
        img(qrUri, 560, 560),
        txt('SCANNE & JOUE', { fontFamily: 'Bebas Neue', fontSize: 42, letterSpacing: 5, color: BLEU_DARK }),
      ]),

      // Pied compact
      box({ flexDirection: 'column', alignItems: 'center', gap: 10 }, [
        box({ backgroundColor: GOLD, borderRadius: 999, paddingTop: 8, paddingBottom: 8, paddingLeft: 24, paddingRight: 24 }, [
          txt('GRATUIT · SANS INSCRIPTION', { fontFamily: 'Bebas Neue', fontSize: 28, letterSpacing: 2, color: '#2a2208' }),
        ]),
        txt('roulademarseillaise.fr', { fontSize: 22, fontWeight: 800, color: GOLD_LIGHT }),
      ]),
    ]
  );

  const { default: satori } = await import('satori');
  const svg = await satori(tree, { width: W, height: H, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  const out = path.join(__dirname, '../../mockups/sticker-tournee.png');
  fs.writeFileSync(out, png);
  console.log('OK →', out);
})().catch((e) => { console.error(e); process.exit(1); });
