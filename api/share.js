/**
 * api/share.js — public share pages (spec AD-1) and growth-journey ask links.
 *
 * GET /r/<slug>    (rewritten to /api/share?slug=<slug>)
 * GET /a/<key>     (rewritten to /api/share?archetype=<key>)
 * GET /ask/<slug>  (rewritten to /api/share?ask=<slug>)
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
import { computeArchetype, ARCHETYPES } from '../src/data/archetypes.js';

const SLUG_RE = /^[1-9A-HJ-NP-Za-km-z]{10}$/; // base58, 10 chars

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

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

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Replace the content attribute of an existing meta tag; inject if absent. */
export function setMeta(html, attr, key, value) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`);
  if (re.test(html)) return html.replace(re, `$1${esc(value)}$2`);
  return html.replace('</head>', `  <meta ${attr}="${key}" content="${esc(value)}" />\n</head>`);
}

export function buildSharePage(shell, { slug, code, origin }) {
  // Lead with the archetype when the code decodes — it's the shareable hook.
  const decoded = decodeParams(code);
  const arch = decoded ? computeArchetype(decoded)?.archetype : null;
  const title = arch
    ? `${arch.name} — Love Landscape`
    : 'A relational landscape — Love Landscape';
  const description = arch
    ? `Someone's terrain is ${arch.name} — ${arch.essence} What's yours?`
    : 'Someone shared the shape of their relational world. Explore it — then map your own.';
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

/**
 * Per-archetype share page for /a/<key> (served by this same function to stay
 * under the Hobby serverless-function limit). Injects window.__ARCHETYPE__ so
 * the SPA opens the gallery focused on that type.
 */
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
  const bootstrap = `<script>window.__ARCHETYPE__=${JSON.stringify(arch.key)};</script>`;
  html = html.replace('</head>', `  ${bootstrap}\n</head>`);
  return html;
}

/**
 * The growth-journey ask page for /ask/<slug>.
 *
 * This is NOT a share page, and the difference is the whole design. A share
 * page wants to travel: it leads with the archetype and renders the terrain
 * into the link preview. An ask link is a private question sent to one person,
 * so it does the opposite — noindex, the site's generic image rather than the
 * sender's terrain, and a title that says nothing about whose landscape it is
 * or what shape it has. A link preview in a group chat must not reveal what
 * the recipient has not yet opened.
 */
export function buildAskPage(shell, { slug, code, answered, origin }) {
  const title = 'A question about where this is going — Love Landscape';
  const description = 'Someone opened their relational landscape and asked one question: where do you want this to be?';
  const pageUrl = `${origin}/ask/${slug}`;
  const imageUrl = `${origin}/api/og`;

  let html = shell;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'name', 'robots', 'noindex, nofollow');
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', pageUrl);
  html = setMeta(html, 'property', 'og:image', imageUrl);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = setMeta(html, 'name', 'twitter:image', imageUrl);
  html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${esc(pageUrl)}$2`);
  const bootstrap = `<script>window.__ASK__=${JSON.stringify({ slug, code, answered: Boolean(answered) })};</script>`;
  html = html.replace('</head>', `  ${bootstrap}\n</head>`);
  return html;
}

export function askGoneBody(origin) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>This question is closed — Love Landscape</title><meta name="robots" content="noindex, nofollow" /></head>
<body style="font-family:Georgia,serif;text-align:center;padding-top:4rem;color:#2a2a28">
<h1 style="font-weight:400">This question is closed</h1>
<p>The person who sent it has taken it back. Nothing was recorded.</p>
<p><a href="${esc(origin)}/" style="color:#7F77DD">Map your own landscape &rarr;</a></p>
</body></html>`;
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

  // Production canonicalizes to www (apex 307s there); og:image must not redirect,
  // so coerce a bare apex origin to www (leaves localhost/preview hosts untouched).
  const origin = (process.env.PUBLIC_ORIGIN || process.env.VITE_PUBLIC_URL || 'https://www.love-landscape.com')
    .replace('://love-landscape.com', '://www.love-landscape.com');

  // /a/<key> is rewritten here too (one function, Hobby-plan limit). No DB needed.
  const archetypeKey = req.query?.archetype;
  if (archetypeKey !== undefined) {
    const arch = ARCHETYPES.find((a) => a.key === archetypeKey);
    if (!arch) {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
      res.setHeader('Location', `${origin}/archetypes`);
      return res.status(302).end();
    }
    const shell = loadShell();
    if (!shell) {
      console.error('share: SPA shell not found — check includeFiles in vercel.json');
      return res.status(500).send('Page unavailable');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400');
    return res.status(200).send(buildArchetypePage(shell, { arch, origin }));
  }

  // /ask/<slug> — the growth-journey question. Served here for the same
  // one-function reason as /a/<key>.
  const askSlug = req.query?.ask;
  if (askSlug !== undefined) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Never cached at the edge: an ask's status changes when it is answered or
    // withdrawn, and a stale page would keep taking answers to a closed question.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');

    const supabaseAsk = getServiceClient();
    if (!supabaseAsk) return res.status(503).send('Service not configured');
    if (!SLUG_RE.test(String(askSlug))) return res.status(410).send(askGoneBody(origin));

    const { data: ask, error: askError } = await supabaseAsk
      .from('asks')
      .select('slug, status, results(code)')
      .eq('slug', askSlug)
      .maybeSingle();
    if (askError) return res.status(503).send('Temporarily unavailable');

    const askCode = ask?.results?.code;
    if (!ask || ask.status === 'withdrawn' || !askCode || !decodeParams(askCode)) {
      return res.status(410).send(askGoneBody(origin));
    }

    const shellForAsk = loadShell();
    if (!shellForAsk) {
      console.error('share: SPA shell not found — check includeFiles in vercel.json');
      return res.status(500).send('Page unavailable');
    }
    return res.status(200).send(buildAskPage(shellForAsk, {
      slug: ask.slug, code: askCode, answered: ask.status === 'answered', origin,
    }));
  }

  const slug = req.query?.slug;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const gone = () => {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
    return res.status(410).send(goneBody(origin));
  };

  if (!slug || !SLUG_RE.test(slug)) return gone();

  const supabase = getServiceClient();
  if (!supabase) return res.status(503).send('Service not configured');

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
