/**
 * Vercel Edge Middleware — intercepts crawler requests to serve proper OG meta tags.
 *
 * When a social platform crawler (Facebook, Twitter, Slack, LinkedIn, Discord, etc.)
 * requests a page with ?code= params, this middleware returns a lightweight HTML page
 * with the correct Open Graph tags so link previews unfurl correctly.
 *
 * Regular browser requests pass through untouched.
 */

import { computeArchetype } from './src/data/archetypes.js';

const CRAWLER_UA_PATTERNS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'Discord',
  'WhatsApp',
  'Telegram',
  'Applebot',
  'Pinterest',
  'Embedly',
  'Quora',
  'Outbrain',
  'vkShare',
  'W3C_Validator',
  'Iframely',
  'Pinterestbot',
  'TelegramBot',
  'redditbot',
  'Bluesky',        // Bluesky Cardyb/1.1
  'Mastodon',       // Mastodon/4.x instances fetch previews themselves
  'meta-externalagent', // Meta's newer crawler (Threads, FB)
  'Snapchat',
  'SkypeUriPreview',
  'Viber',
  'LineBot',
];

// www is the canonical host in production (apex 307s to it) — crawlers must not
// be sent through a redirect to reach the OG image.
const BASE_URL = 'https://www.love-landscape.com';

export const config = {
  matcher: '/',
};

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  // Only intercept if: (1) a crawler is requesting AND (2) there's a ?code= param
  // Crawlers on the bare homepage will get the static index.html meta tags, which is fine.
  const isCrawler = CRAWLER_UA_PATTERNS.some(
    (pattern) => ua.toLowerCase().includes(pattern.toLowerCase()),
  );

  if (!isCrawler || !code) {
    return; // pass through to normal Vite app
  }

  // Lead with the archetype when the code decodes; fall back to the
  // top-dimensions description otherwise.
  const arch = getArchetype(code);
  const title = arch
    ? `${arch.name} — Love Landscape`
    : 'My Relational Landscape — Love Landscape';
  const description = arch
    ? `Someone's terrain is ${arch.name} — ${arch.essence} What's yours?`
    : getDescription(code);
  const ogImageUrl = `${BASE_URL}/api/og?code=${encodeURIComponent(code)}`;
  const pageUrl = `${BASE_URL}/?code=${encodeURIComponent(code)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Love Landscape" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="A personalized 3D terrain map of relational intimacy" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  <meta name="twitter:image:alt" content="A personalized 3D terrain map of relational intimacy" />

  <link rel="canonical" href="${pageUrl}" />

  <script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: description,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebApplication',
      name: 'Love Landscape',
      url: BASE_URL,
    },
  })}
  </script>

  <!-- Redirect real browsers that somehow get this page -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <p><a href="${pageUrl}">View this landscape on Love Landscape</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

const PARAM_LABELS = [
  'Deep Friendships', 'Romantic Love', 'Tender Middle', 'Casual Touch',
  'Physical Barriers', 'Ungrounded Barriers', 'Uncertainty Tolerance',
  'Openness', 'Mapped Terrain', 'Self-Intimacy', 'Conflict Approach',
  'Playfulness', 'Attachment Security',
];

/** Decode a code to its 13 params, or null if malformed. */
function decodeCodeParams(code) {
  const isV2 = code.startsWith('L2_');
  const payload = isV2 || code.startsWith('L1_') ? code.slice(3) : null;
  if (!payload) return null;
  let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  let binary;
  try { binary = atob(b64); } catch { return null; }
  if (binary.length !== (isV2 ? 13 : 9)) return null;
  const params = [];
  for (let i = 0; i < binary.length; i++) params.push(binary.charCodeAt(i) / 255);
  while (params.length < 13) params.push(0.5); // pad L1 → L2
  return params;
}

/** Nearest archetype for a code, or null. */
function getArchetype(code) {
  try {
    const params = decodeCodeParams(code);
    if (!params) return null;
    return computeArchetype(params)?.archetype || null;
  } catch { return null; }
}

function getDescription(code) {
  try {
    const isV2 = code.startsWith('L2_');
    const payload = isV2 || code.startsWith('L1_') ? code.slice(3) : null;
    if (!payload) return fallbackDescription();

    let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const binary = atob(b64);
    // L2 codes carry exactly 13 param bytes, L1 exactly 9 — anything else is garbage
    if (binary.length !== (isV2 ? 13 : 9)) return fallbackDescription();

    const params = [];
    for (let i = 0; i < binary.length; i++) {
      params.push(binary.charCodeAt(i) / 255);
    }

    // Find the top 3 dimensions to describe
    const indexed = params.map((v, i) => ({ label: PARAM_LABELS[i] || `P${i}`, value: v }));
    const top3 = indexed.sort((a, b) => b.value - a.value).slice(0, 3);
    const topNames = top3.map((d) => d.label.toLowerCase()).join(', ');

    return `A personalized relational landscape. Strongest dimensions: ${topNames}. Take the 19-question assessment to map your own terrain.`;
  } catch {
    return fallbackDescription();
  }
}

function fallbackDescription() {
  return 'A 19-question assessment that maps your relational openness onto a 3D terrain. See where your relationships naturally settle — and where the ridges are.';
}
