import { describe, it, expect } from 'vitest';
import { compareWishes, buildWishSection } from '../src/data/wishAlignment.js';
import { computeParams } from '../src/data/paramCompute.js';
import { personas } from '../analysis/personas.js';

const P = (name) => computeParams(personas.find((p) => p.name === name).answers);
const NEUTRAL = Array(13).fill(0.5);

const CURRENT = { x: 0.5, y: 0.5 };
const FRIENDSHIP = { x: 0.18, y: 0.82 };
const ROMANCE = { x: 0.62, y: 0.85 };
const TOUCH = { x: 0.80, y: 0.30 };

const verdict = (current, theirs, mine, params = NEUTRAL) =>
  compareWishes(params, current, theirs, mine).verdict;

describe('compareWishes — the question the feature has been circling', () => {
  it('reads two marks on the same ground as wanting the same thing', () => {
    expect(verdict(FRIENDSHIP, ROMANCE, { x: 0.63, y: 0.86 })).toBe('same-place');
  });

  it('separates wanting the same thing from wanting a move of the same size', () => {
    // Both ask for a long crossing, in opposite directions. A reading that
    // compares only how far each wants to travel calls these identical, and
    // they are the whole matter.
    const sameSizeOpposite = compareWishes(NEUTRAL, CURRENT, { x: 0.9, y: 0.5 }, { x: 0.1, y: 0.5 });
    expect(sameSizeOpposite.biggerMove).toBe('even');
    expect(sameSizeOpposite.verdict).toBe('opposite-ways');
  });

  it('notices when one of you would leave it exactly where it is', () => {
    expect(verdict(FRIENDSHIP, TOUCH, { x: 0.19, y: 0.82 })).toBe('you-would-stay');
    expect(verdict(FRIENDSHIP, { x: 0.19, y: 0.82 }, TOUCH)).toBe('they-would-stay');
  });

  it('notices when neither of you is asking for anything', () => {
    expect(verdict(FRIENDSHIP, { x: 0.19, y: 0.83 }, { x: 0.18, y: 0.81 })).toBe('both-content');
  });

  it('calls two marks in the same feature the same kind of thing', () => {
    // Both land in the romantic valley, at different depths within it.
    const cmp = compareWishes(P('Elena'), FRIENDSHIP, { x: 0.58, y: 0.80 }, { x: 0.66, y: 0.90 });
    expect(cmp.sameFeature).toBe(true);
    expect(cmp.verdict).toBe('same-region');
  });

  it('distinguishes different places from opposite directions', () => {
    // Both move "up and away" from the friendship valley, just not together.
    expect(verdict(FRIENDSHIP, TOUCH, { x: 0.12, y: 0.55 })).toBe('different-places');
  });

  it('says who is asking for the bigger move, and when that is not a real difference', () => {
    expect(compareWishes(NEUTRAL, CURRENT, { x: 0.95, y: 0.5 }, { x: 0.6, y: 0.5 }).biggerMove).toBe('them');
    expect(compareWishes(NEUTRAL, CURRENT, { x: 0.6, y: 0.5 }, { x: 0.95, y: 0.5 }).biggerMove).toBe('you');
    expect(compareWishes(NEUTRAL, CURRENT, { x: 0.8, y: 0.5 }, { x: 0.78, y: 0.5 }).biggerMove).toBe('even');
  });

  it('refuses malformed input instead of throwing', () => {
    expect(compareWishes(null, CURRENT, ROMANCE, TOUCH)).toBeNull();
    expect(compareWishes(NEUTRAL, null, ROMANCE, TOUCH)).toBeNull();
    expect(compareWishes(NEUTRAL, CURRENT, ROMANCE, null)).toBeNull();
  });
});

describe('buildWishSection', () => {
  const everySection = () => {
    const cases = [
      [FRIENDSHIP, ROMANCE, { x: 0.63, y: 0.86 }],
      [FRIENDSHIP, TOUCH, { x: 0.19, y: 0.82 }],
      [FRIENDSHIP, { x: 0.19, y: 0.82 }, TOUCH],
      [FRIENDSHIP, { x: 0.19, y: 0.83 }, { x: 0.18, y: 0.81 }],
      [CURRENT, { x: 0.9, y: 0.5 }, { x: 0.1, y: 0.5 }],
      [FRIENDSHIP, TOUCH, { x: 0.12, y: 0.55 }],
      [FRIENDSHIP, { x: 0.58, y: 0.80 }, { x: 0.66, y: 0.90 }],
    ];
    const out = [];
    for (const [c, t, m] of cases) {
      for (const name of [null, 'Sam']) {
        out.push(buildWishSection(compareWishes(P('Elena'), c, t, m), name));
      }
    }
    return out;
  };

  it('writes a section for every verdict, with no placeholder left in it', () => {
    for (const s of everySection()) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.text.length).toBeGreaterThan(80);
      expect(s.text).not.toMatch(/undefined|null|NaN|\[object/);
    }
  });

  it('always says a wish is neither a promise nor a demand', () => {
    for (const s of everySection()) {
      expect(s.text).toContain('not a promise or a demand');
    }
  });

  it('says their answer was given without sight of yours', () => {
    // The sealed order is what makes both answers worth anything, and the
    // reading is the only place the reader is told that it held.
    for (const s of everySection()) {
      expect(s.text).toContain('without seeing yours');
    }
  });

  it('gets pronouns and agreement right in both voices', () => {
    for (const s of everySection()) {
      expect(s.text).not.toMatch(/\bthey is\b|\bthey has\b|\bSam are\b|\bSam have\b/);
    }
  });

  it('keeps numbers out of the prose', () => {
    for (const s of everySection()) expect(s.text).not.toMatch(/\d/);
  });

  it('does not treat wanting to stay as a refusal', () => {
    const s = buildWishSection(compareWishes(P('Elena'), FRIENDSHIP, TOUCH, { x: 0.19, y: 0.82 }), 'Sam');
    expect(s.text).toContain('not a refusal');
  });

  it('names the opposite-directions case as direction rather than pace', () => {
    const s = buildWishSection(compareWishes(NEUTRAL, CURRENT, { x: 0.9, y: 0.5 }, { x: 0.1, y: 0.5 }), null);
    expect(s.title).toContain('different ways');
    expect(s.text).toContain('which way');
  });

  it('returns nothing when there is nothing to compare', () => {
    expect(buildWishSection(null)).toBeNull();
  });
});
