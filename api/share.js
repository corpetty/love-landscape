/**
 * api/share.js — public share pages (spec AD-1).
 *
 * GET /r/<slug>  (rewritten to /api/share?slug=<slug>)
 *
 * Serves the built SPA shell with the share page's OG/Twitter tags swapped in
 * (crawlers read those) and window.__SHARE__ injected (the SPA reads that and
 * renders the shared landscape). No redirect: humans and crawlers get the
 * same URL. Unknown/unpublished slugs → 410.
 *
 * Requires vercel.json: functions["api/share.js"].includeFiles = "dist/index.html"
 * (Vercel bundles only statically-traced files; a runtime read must be declared).
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, optional PUBLIC_ORIGIN
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { decodeParams } from '../src/data/encoding.js';

const SLUG_RE = /^[1-9A-HJ-NP-Za-km-z]{10}$/; // base58, 10 chars

let cachedShell = null;
export function loadShell() {
  if (cachedShell) return cachedShell;
  const candidates = [
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(process.cwd(), 'index.html'),
  ];
  for (const p of candidates) {
    try {
      cachedShell = fs.readFileSync(p, 'utf8');
      return cachedShell;
    } catch { /* try next */ }
  }
  return null;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Replace the content attribute of an existing meta tag; inject if absent. */
function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`);
  if (re.test(html)) return html.replace(re, `$1${esc(value)}$2`);
  return html.replace('</head>', `  <meta ${attr}="${key}" content="${esc(value)}" />\n</head>`);
}

export function buildSharePage(shell, { slug, code, origin }) {
  const title = 'A relational landscape — Love Landscape';
  const description =
    'Someone shared the shape of their relational world. Explore it — then map your own.';
  const pageUrl = `${origin}/r/${slug}`;
  const imageUrl = `${origin}/api/og?code=${encodeURIComponent(code)}`;

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
  // One-shot bootstrap for the SPA. slug/code are strictly validated upstream;
  // JSON.stringify + escaping belt-and-braces anyway.
  const bootstrap = `<script>window.__SHARE__=${JSON.stringify({ slug, code })};</script>`;
  html = html.replace('</head>', `  ${bootstrap}\n</head>`);
  return html;
}

export function goneBody(origin) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>This landscape is no longer shared — Love Landscape</title><meta name="robots" content="noindex" /></head>
<body style="font-family:Georgia,serif;text-align:center;padding-top:4rem;color:#2a2a28">
<h1 style="font-weight:400">This landscape is no longer shared</h1>
<p>The person who published it has taken it down.</p>
<p><a href="${esc(origin)}/" style="color:#7F77DD">Map your own landscape →</a></p>
</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const origin = process.env.PUBLIC_ORIGIN || process.env.VITE_PUBLIC_URL || 'https://www.love-landscape.com';
  const slug = req.query?.slug;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const gone = () => {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
    return res.status(410).send(goneBody(origin));
  };

  if (!slug || !SLUG_RE.test(slug)) return gone();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).send('Service not configured');
  const supabase = createClient(url, key);

  const { data: row, error } = await supabase
    .from('results')
    .select('code, is_public')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return res.status(503).send('Temporarily unavailable');
  if (!row || !row.is_public || !decodeParams(row.code)) return gone();

  const shell = loadShell();
  if (!shell) {
    console.error('share: SPA shell not found — check includeFiles in vercel.json');
    return res.status(500).send('Page unavailable');
  }

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  return res.status(200).send(buildSharePage(shell, { slug, code: row.code, origin }));
}
