/**
 * api/archetype.js — public per-archetype share pages.
 *
 * GET /a/<key>  (rewritten to /api/archetype?key=<key>)
 *
 * Serves the SPA shell with the archetype's OG/Twitter tags swapped in (crawlers
 * read those) and window.__ARCHETYPE__ injected (the SPA opens the gallery focused
 * on that archetype). Unknown keys → redirect to the gallery.
 *
 * Requires vercel.json: functions["api/archetype.js"].includeFiles = "dist/index.html"
 * Env: optional PUBLIC_ORIGIN / VITE_PUBLIC_URL
 */

import { loadShell, esc, setMeta } from './share.js';
import { ARCHETYPES } from '../src/data/archetypes.js';

export function buildArchetypePage(shell, { arch, origin }) {
  const title = `${arch.name} — Love Landscape`;
  const description = `${arch.epithet} — ${arch.essence} ${arch.description}`.slice(0, 300);
  const pageUrl = `${origin}/a/${arch.key}`;
  const imageUrl = `${origin}/api/og?archetype=${encodeURIComponent(arch.key)}`;

  let html = shell;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', pageUrl);
  html = setMeta(html, 'property', 'og:image', imageUrl);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = setMeta(html, 'name', 'twitter:image', imageUrl);
  html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${esc(pageUrl)}$2`);
  // key is validated against ARCHETYPES upstream; JSON.stringify is belt-and-braces.
  const bootstrap = `<script>window.__ARCHETYPE__=${JSON.stringify(arch.key)};</script>`;
  html = html.replace('</head>', `  ${bootstrap}\n</head>`);
  return html;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const origin = process.env.PUBLIC_ORIGIN || process.env.VITE_PUBLIC_URL || 'https://www.love-landscape.com';
  const key = req.query?.key;
  const arch = ARCHETYPES.find((a) => a.key === key);

  // Unknown key → send humans and crawlers to the gallery.
  if (!arch) {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
    res.setHeader('Location', `${origin}/archetypes`);
    return res.status(302).end();
  }

  const shell = loadShell();
  if (!shell) {
    console.error('archetype: SPA shell not found — check includeFiles in vercel.json');
    return res.status(500).send('Page unavailable');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400');
  return res.status(200).send(buildArchetypePage(shell, { arch, origin }));
}
