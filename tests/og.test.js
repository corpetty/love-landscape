import { describe, it, expect } from 'vitest';
import handler from '../api/og.js';

/**
 * Regression lock for the OG image generator. The personalized branch once
 * violated Satori's explicit-display:flex rule, which made ImageResponse
 * throw mid-stream in production: HTTP 200, image/png, zero bytes — cached
 * immutable for a year per code. These tests render the real handler.
 */

async function renderBytes(url) {
  const res = handler({ url });
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

describe('api/og', () => {
  it('renders the default branded image', async () => {
    const buf = await renderBytes('https://www.love-landscape.com/api/og');
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
  });

  it('renders a personalized image for a valid code (the once-broken branch)', async () => {
    const buf = await renderBytes('https://www.love-landscape.com/api/og?code=L2_5k2zmWaAzLOZ5oCZsw');
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
  });

  it('renders personalized even for all-zero and all-max params', async () => {
    for (const code of ['L2_AAAAAAAAAAAAAAAAAA', 'L2_____________________'.slice(0, 21)]) {
      const buf = await renderBytes(`https://x/api/og?code=${code}`);
      expect(buf.length).toBeGreaterThan(1000);
    }
  });

  it('falls back to the default image on a malformed code', async () => {
    const buf = await renderBytes('https://x/api/og?code=not-a-code');
    expect(buf.length).toBeGreaterThan(1000);
  });
});
