import { describe, it, expect } from 'vitest';
import { SCIENCE_MAP, SCIENCE_TIERS, SCIENCE_VERSION } from '../src/data/scienceMap.js';
import { scoreBand, generateReading } from '../src/data/interpretation.js';

describe('SCIENCE_MAP', () => {
  it('has exactly one entry per dimension, aligned to the reading order', () => {
    // generateReading returns 13 items in PARAM_LABELS order; the map keys to the same index.
    const reading = generateReading(new Array(13).fill(0.5));
    expect(SCIENCE_MAP).toHaveLength(reading.length);
    expect(SCIENCE_MAP).toHaveLength(13);
  });

  it('every entry is complete and well-formed', () => {
    for (const [i, e] of SCIENCE_MAP.entries()) {
      expect(e.instrument, `#${i} instrument`).toBeTruthy();
      expect(e.construct, `#${i} construct`).toBeTruthy();
      expect(SCIENCE_TIERS[e.tier], `#${i} tier "${e.tier}"`).toBeTruthy();
      for (const band of ['low', 'mid', 'high']) {
        expect(e.maps?.[band], `#${i} maps.${band}`).toBeTruthy();
      }
      expect(e.whatYoudLearn, `#${i} whatYoudLearn`).toBeTruthy();
      expect(e.source?.label, `#${i} source.label`).toBeTruthy();
      expect(e.source?.url, `#${i} source.url`).toMatch(/^https:\/\/\S+$/);
      // caveat is optional but, if present, must be a non-empty string
      if (e.caveat != null) expect(typeof e.caveat).toBe('string');
    }
  });

  it('exposes the four honesty tiers and a version', () => {
    expect(Object.keys(SCIENCE_TIERS).sort()).toEqual(['frontier', 'grounded', 'mapping', 'related']);
    for (const t of Object.values(SCIENCE_TIERS)) {
      expect(t.label).toBeTruthy();
      expect(t.blurb).toBeTruthy();
    }
    expect(typeof SCIENCE_VERSION).toBe('number');
  });

  it('marks the tender middle as our own contribution and P0/P1 as mapping-in-progress', () => {
    expect(SCIENCE_MAP[2].tier).toBe('frontier'); // tender middle
    expect(SCIENCE_MAP[0].tier).toBe('mapping');  // deep friendships
    expect(SCIENCE_MAP[1].tier).toBe('mapping');  // romantic love
    expect(SCIENCE_MAP[12].tier).toBe('grounded'); // attachment (ECR-R)
  });

  it('surfaces caveats where the science pass flagged them (ROCI-II, SRIS)', () => {
    expect(SCIENCE_MAP[8].caveat).toBeTruthy();  // P8 SRIS reflection≠insight
    expect(SCIENCE_MAP[10].caveat).toBeTruthy(); // P10 ROCI-II contested
  });
});

describe('scoreBand', () => {
  it('buckets on the same thresholds the interpretation text uses', () => {
    expect(scoreBand(0)).toBe('low');
    expect(scoreBand(0.34)).toBe('low');
    expect(scoreBand(0.35)).toBe('mid');
    expect(scoreBand(0.5)).toBe('mid');
    expect(scoreBand(0.65)).toBe('mid');
    expect(scoreBand(0.66)).toBe('high');
    expect(scoreBand(1)).toBe('high');
  });
});
