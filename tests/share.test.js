import { describe, it, expect } from 'vitest';
import { buildSharePage, buildArchetypePage, goneBody } from '../api/share.js';
import { ARCHETYPES } from '../src/data/archetypes.js';

// A miniature of the real dist/index.html head (tests must not depend on a
// built dist/ — CI runs tests before build).
const SHELL = `<!DOCTYPE html>
<html><head>
<title>Love Landscape — The Shape of Intimacy</title>
<meta name="description" content="A 17-question assessment." />
<link rel="canonical" href="https://love-landscape.com" />
<meta property="og:title" content="Love Landscape — The Shape of Intimacy" />
<meta property="og:description" content="A 17-question assessment." />
<meta property="og:url" content="https://love-landscape.com" />
<meta property="og:image" content="https://love-landscape.com/api/og" />
<meta name="twitter:title" content="Love Landscape — The Shape of Intimacy" />
<meta name="twitter:description" content="A 17-question assessment." />
<meta name="twitter:image" content="https://love-landscape.com/api/og" />
</head><body><div id="root"></div></body></html>`;

const SLUG = 'Ab3xY9kQ2z';
const CODE = 'L2_AAAAAAAAAAAAAAAAAA';
const ORIGIN = 'https://www.love-landscape.com';

describe('buildSharePage', () => {
  const html = buildSharePage(SHELL, { slug: SLUG, code: CODE, origin: ORIGIN });

  it('replaces OG tags in place — no duplicates for crawlers', () => {
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/property="og:image"/g)).toHaveLength(1);
    expect(html).toContain(`content="${ORIGIN}/r/${SLUG}"`);
    expect(html).toContain(`content="${ORIGIN}/api/og?code=${encodeURIComponent(CODE)}"`);
    expect(html).not.toContain('The Shape of Intimacy</title>'); // title swapped
  });

  it('leads the title and description with the decoded archetype', () => {
    // A valid code resolves to an archetype ("The <Name>") — the shareable hook.
    expect(html).toMatch(/<title>The [\w ]+ — Love Landscape<\/title>/);
    expect(html).toMatch(/terrain is The [\w ]+/);
  });

  it('falls back to the generic title when the code does not decode', () => {
    const bad = buildSharePage(SHELL, { slug: SLUG, code: 'L2_notavalidcode', origin: ORIGIN });
    expect(bad).toContain('<title>A relational landscape — Love Landscape</title>');
  });

  it('updates the canonical link to the share URL', () => {
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/r/${SLUG}"`);
  });

  it('injects the one-shot __SHARE__ bootstrap', () => {
    expect(html).toContain(`window.__SHARE__={"slug":"${SLUG}","code":"${CODE}"}`);
  });

  it('escapes hostile content in interpolated values', () => {
    const evil = buildSharePage(SHELL, {
      slug: SLUG,
      code: CODE,
      origin: 'https://x.com"><script>alert(1)</script>',
    });
    expect(evil).not.toContain('"><script>alert(1)</script>');
  });
});

describe('buildArchetypePage (folded /a/<key> path)', () => {
  const arch = ARCHETYPES[0];
  const html = buildArchetypePage(SHELL, { arch, origin: ORIGIN });

  it('swaps in the archetype OG tags and points the image at ?archetype=', () => {
    expect(html).toContain(`<title>${arch.name} — Love Landscape</title>`);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).toContain(`content="${ORIGIN}/api/og?archetype=${arch.key}"`);
    expect(html).toContain(`content="${ORIGIN}/a/${arch.key}"`); // og:url + canonical
  });

  it('injects the __ARCHETYPE__ bootstrap for the SPA', () => {
    expect(html).toContain(`window.__ARCHETYPE__=${JSON.stringify(arch.key)}`);
  });
});

describe('goneBody', () => {
  it('is noindexed and links home', () => {
    const body = goneBody(ORIGIN);
    expect(body).toContain('noindex');
    expect(body).toContain(`${ORIGIN}/`);
    expect(body).toContain('no longer shared');
  });
});
