// Sitemap dynamique pour le SEO.
// Liste les pages publiques fixes + chaque galerie partagée + chaque pack share.
// Nginx route /sitemap.xml → /api/sitemap.xml (à brancher côté nginx.conf).

const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Pack = require('../models/Pack');

const SITE_URL = process.env.CLIENT_URL || 'https://arka.michaelrichaud.fr';

// Pages publiques fixes (priorité haute, mise à jour quotidienne)
const STATIC_PAGES = [
  { loc: '/',         priority: '1.0', changefreq: 'weekly' },
  { loc: '/premium',  priority: '0.9', changefreq: 'monthly' },
  { loc: '/packs',    priority: '0.8', changefreq: 'weekly' },
  { loc: '/packs?tab=cosmetics', priority: '0.7', changefreq: 'weekly' },
  { loc: '/login',    priority: '0.3', changefreq: 'yearly' },
];

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function urlElement({ loc, lastmod, priority = '0.5', changefreq = 'monthly' }) {
  return `  <url>\n    <loc>${xmlEscape(SITE_URL + loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

router.get('/sitemap.xml', async (req, res, next) => {
  try {
    // 1. Pages fixes
    const urls = STATIC_PAGES.map((p) => urlElement(p));

    // 2. Galeries publiques (chaque session sauvegardée a un shareLink consultable sans auth)
    //    On limite à 500 pour ne pas faire un sitemap géant. Les plus récentes en priorité.
    const sessions = await Session.find({ shareLink: { $ne: null } })
      .sort({ createdAt: -1 })
      .limit(500)
      .select('shareLink createdAt');
    for (const s of sessions) {
      urls.push(urlElement({
        loc: `/gallery/${s.shareLink}`,
        lastmod: s.createdAt?.toISOString().slice(0, 10),
        priority: '0.5',
        changefreq: 'yearly',
      }));
    }

    // 3. Packs publics avec shareCode (officiels + persos partageables)
    const packs = await Pack.find({ shareCode: { $ne: null }, isActive: { $ne: false } })
      .select('shareCode updatedAt');
    for (const p of packs) {
      urls.push(urlElement({
        loc: `/packs/import/${p.shareCode}`,
        lastmod: p.updatedAt?.toISOString().slice(0, 10),
        priority: '0.6',
        changefreq: 'monthly',
      }));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=3600'); // cache 1h
    res.send(xml);
  } catch (err) { next(err); }
});

module.exports = router;
