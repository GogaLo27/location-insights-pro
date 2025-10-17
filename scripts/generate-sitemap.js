const fs = require('fs');
const path = require('path');

// Base URL for sitemap entries. Adjust if deploying to a subpath.
const BASE_URL = process.env.SITE_URL || 'https://yourdomain.com';

const outPath = path.join(__dirname, '..', 'public', 'sitemap.xml');

// Static routes from the app (public and allowed pages)
const routes = [
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/cookie-policy',
  '/refund-policy',
  '/plan-selection'
];

// Optionally include public dashboard/legal pages (they're protected behind auth) - exclude them by default
// If you want them included, add '/dashboard', '/dashboard/privacy', etc.

function formatUrl(route) {
  const url = `${BASE_URL.replace(/\/$/, '')}${route}`;
  return `  <url>\n    <loc>${url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
}

function buildSitemap() {
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  const footer = '\n</urlset>';
  const body = routes.map(formatUrl).join('\n');
  return header + body + footer;
}

function ensurePublicDir() {
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
}

try {
  ensurePublicDir();
  const xml = buildSitemap();
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`Sitemap written to ${outPath}`);
} catch (err) {
  console.error('Failed to generate sitemap:', err);
  process.exit(1);
}
