import { describe, it, expect } from 'vitest';
import { buildPathNarrative, symmetryLine, featurePhrase, SECTION_KINDS } from '../src/data/pathNarrative.js';
import { findPath } from '../src/terrain/pathfinder.js';
import { computeParams } from '../src/data/paramCompute.js';
import { personas } from '../analysis/personas.js';

const P = Object.fromEntries(personas.map((p) => [p.name, computeParams(p.answers)]));
const NEUTRAL = Array(13).fill(0.5);

const FRIENDSHIP = { x: 0.18, y: 0.82 };
const ROMANCE = { x: 0.62, y: 0.85 };
const TOUCH = { x: 0.80, y: 0.30 };
const TENDER = { x: 0.50, y: 0.50 };
const DEEP_PHYSICAL = { x: 0.80, y: 0.75 };

const kinds = (n) => n.sections.map((s) => s.kind);
const allText = (n) => n.sections.map((s) => `${s.title}\n${s.text}`).join('\n\n');

/** Every journey the seed personas can produce, both directions of voice. */
function everyReading() {
  const journeys = [
    [FRIENDSHIP, TOUCH], [FRIENDSHIP, ROMANCE], [TENDER, DEEP_PHYSICAL],
    [TENDER, { x: 0.55, y: 0.56 }], [TOUCH, ROMANCE], [TENDER, { x: 0.97, y: 0.97 }],
  ];
  const out = [];
  for (const params of Object.values(P)) {
    for (const [a, b] of journeys) {
      for (const wish of [null, 0, 1]) {
        const path = findPath(params, a, b, { exclusivity: wish });
        out.push(buildPathNarrative(path, { perspective: 'owner', otherName: 'Sam' }));
        out.push(buildPathNarrative(path, { perspective: 'partner', otherName: null }));
        out.push(buildPathNarrative(path, { perspective: 'partner', otherName: 'Alex' }));
      }
    }
  }
  return out;
}

describe('buildPathNarrative — structure', () => {
  it('always opens with where the bond stands and closes with conversations', () => {
    for (const n of everyReading()) {
      expect(kinds(n)[0]).toBe('standing');
      expect(kinds(n)[1]).toBe('wanting');
      expect(kinds(n).at(-1)).toBe('conversations');
    }
  });

  it('emits only known section kinds, each at most once', () => {
    for (const n of everyReading()) {
      const seen = kinds(n);
      for (const k of seen) expect(SECTION_KINDS).toContain(k);
      expect(new Set(seen).size).toBe(seen.length);
    }
  });

  it('never emits an empty or placeholder section', () => {
    for (const n of everyReading()) {
      for (const s of n.sections) {
        expect(s.title.trim().length).toBeGreaterThan(0);
        expect(s.text.trim().length).toBeGreaterThan(30);
        expect(s.text).not.toMatch(/undefined|null|NaN|\[object/);
      }
    }
  });

  it('returns null rather than half a reading when there is no path', () => {
    expect(buildPathNarrative(null)).toBeNull();
    expect(buildPathNarrative({})).toBeNull();
  });
});

describe('buildPathNarrative — voice', () => {
  it('speaks to the landscape owner about the other person, by name', () => {
    const path = findPath(P.Elena, FRIENDSHIP, TOUCH);
    const text = allText(buildPathNarrative(path, { perspective: 'owner', otherName: 'Sam' }));
    expect(text).toContain('Sam stands in your');
    expect(text).toMatch(/Sam wants/);
  });

  it('speaks to the partner about the owner', () => {
    const path = findPath(P.Elena, FRIENDSHIP, TOUCH);
    const text = allText(buildPathNarrative(path, { perspective: 'partner', otherName: 'Robin' }));
    expect(text).toContain('You stand in');
    expect(text).toContain("Robin's");
  });

  it('conjugates and cases pronouns correctly in every reading', () => {
    // "for they", "give they", "they wants" — the grammar failures that would
    // make a reading about someone's relationship feel machine-made.
    for (const n of everyReading()) {
      const text = allText(n);
      expect(text).not.toMatch(/\b(For|for|give|to|of) they\b/);
      expect(text).not.toMatch(/\bthey (wants|stands|has|is)\b/);
      // "neither of you has" is correct; "you has" as a subject is not.
      expect(text).not.toMatch(/(?<!of )\byou (wants|stands|has)\b/);
      expect(text).not.toMatch(/\bthem (want|stand)\b/);
    }
  });

  it('falls back to they/them when the other person has no name', () => {
    const path = findPath(P.Elena, FRIENDSHIP, TOUCH);
    const text = allText(buildPathNarrative(path, { perspective: 'owner', otherName: null }));
    expect(text).toMatch(/^They stand/m);
  });
});

describe('buildPathNarrative — the copy rules the feature depends on', () => {
  it("attributes every ridge to the landscape owner, never to the other person", () => {
    const walled = [...NEUTRAL];
    walled[4] = 1;
    const path = findPath(walled, { x: 0.50, y: 0.04 }, { x: 0.50, y: 0.34 });
    const route = buildPathNarrative(path, { perspective: 'owner', otherName: 'Sam' })
      .sections.find((s) => s.kind === 'route');
    expect(route.text).toContain('your');
    expect(route.text).toMatch(/a need, not an obstacle someone put there/);
  });

  it('never blames the person who wants to move, and never calls the wish wrong', () => {
    for (const n of everyReading()) {
      const text = allText(n).toLowerCase();
      expect(text).not.toMatch(/too much|unrealistic|should not want|asking too|unreasonable/);
    }
  });

  it('gives both people something to do wherever it names a difficulty', () => {
    const walled = [...NEUTRAL];
    walled[4] = 1;
    const path = findPath(walled, { x: 0.50, y: 0.04 }, { x: 0.50, y: 0.34 });
    const asks = buildPathNarrative(path, { perspective: 'owner', otherName: 'Sam' })
      .sections.find((s) => s.kind === 'asks');
    expect(asks.text).toContain('For you:');
    expect(asks.text).toContain('For Sam:');
  });

  it('quotes the mover\'s own note when they left one', () => {
    const path = findPath(P.Sofia, TENDER, ROMANCE);
    const n = buildPathNarrative(path, { perspective: 'owner', otherName: 'Sam', note: '  more ease  ' });
    expect(n.sections.find((s) => s.kind === 'wanting').text).toContain('“more ease”');
  });
});

describe('buildPathNarrative — what it says about each kind of journey', () => {
  it('names the ridges in the way when the route crosses them', () => {
    const path = findPath(P.Amara, TENDER, DEEP_PHYSICAL);
    const n = buildPathNarrative(path, { perspective: 'owner' });
    const route = n.sections.find((s) => s.kind === 'route');
    expect(route.text).toContain('Ungrounded-intensity ridge');
    expect(kinds(n)).toContain('asks');
  });

  it('reads a steep route with no ridge as the wall of the valley itself', () => {
    // Elena's tender middle is deep; nothing blocks the way out of it, and the
    // climb is still real. Missing this reads as "nothing is in the way" on a
    // journey the reading has just called steep.
    const path = findPath(P.Elena, TENDER, DEEP_PHYSICAL);
    expect(path.storyType).toBe('the-wall');
    expect(path.ridgesCrossed).toHaveLength(0);
    const route = buildPathNarrative(path, { perspective: 'owner' })
      .sections.find((s) => s.kind === 'route');
    expect(route.title).toBe('The climb is the valley itself');
  });

  it('says the route went around a barrier that is still there', () => {
    // Amara's route both climbs out of a deep valley and bends around her
    // uncertainty ridge. Both facts have to survive into the reading — an
    // either/or here quietly drops one of them.
    const path = findPath(P.Amara, FRIENDSHIP, TOUCH);
    const route = buildPathNarrative(path, { perspective: 'owner' })
      .sections.find((s) => s.kind === 'route');
    expect(route.title).toBe('The climb is the valley itself');
    expect(route.text).toContain('uncertainty ridge');
    expect(route.text).toContain('goes around instead');
  });

  it('names unexplored ground as unknown, not as danger', () => {
    const unmapped = [...NEUTRAL];
    unmapped[8] = 0;
    const path = findPath(unmapped, TENDER, { x: 0.97, y: 0.97 });
    const fog = buildPathNarrative(path, { perspective: 'owner' })
      .sections.find((s) => s.kind === 'fog');
    expect(fog.text).toContain('not a warning');
  });

  it('keeps every number out of the prose', () => {
    for (const n of everyReading()) {
      expect(allText(n)).not.toMatch(/\d/);
    }
  });
});

describe('buildPathNarrative — the exclusivity wish', () => {
  it('says nothing at all when the wish was left unset', () => {
    const path = findPath(P.Elena, TENDER, ROMANCE);
    expect(kinds(buildPathNarrative(path, { perspective: 'owner' }))).not.toContain('exclusivity');
  });

  it('names a mismatch as an agreement, not a distance to be walked', () => {
    const path = findPath(P.Elena, TENDER, ROMANCE, { exclusivity: 1 });
    const s = buildPathNarrative(path, { perspective: 'owner', otherName: 'Sam' })
      .sections.find((x) => x.kind === 'exclusivity');
    expect(s.text).toContain('it is an agreement');
    expect(s.text).toContain('Sam');
  });

  it('reads a matching wish as the easy part', () => {
    const path = findPath(P.Amara, TENDER, ROMANCE, { exclusivity: 1 });
    const s = buildPathNarrative(path, { perspective: 'owner' })
      .sections.find((x) => x.kind === 'exclusivity');
    expect(s.text).toContain('not the hard part');
  });
});

describe('featurePhrase', () => {
  it('says map labels as English', () => {
    expect(featurePhrase({ name: 'Deep friendships', isRidge: false })).toBe('deep-friendship valley');
    expect(featurePhrase({ name: 'Empty physicality', isRidge: true })).toBe('empty-physicality ridge');
  });

  it('follows the sign, so a raised tender middle is not called a valley', () => {
    expect(featurePhrase({ name: 'Casual touch', isRidge: true })).toBe('casual-touch ridge');
    expect(featurePhrase({ name: 'Conflict ridge', isRidge: false })).toBe('conflict valley');
  });

  it('still reads for a feature it has never seen', () => {
    expect(featurePhrase({ name: 'New Feature', isRidge: false })).toBe('new feature valley');
    expect(featurePhrase(null)).toBeNull();
  });
});

describe('symmetryLine', () => {
  it('needs both journeys', () => {
    expect(symmetryLine(null, null)).toBeNull();
    expect(symmetryLine(findPath(NEUTRAL, TENDER, ROMANCE), null)).toBeNull();
  });

  it('calls two small asks close to settled', () => {
    const tiny = findPath(NEUTRAL, TENDER, { x: 0.52, y: 0.52 });
    expect(symmetryLine(tiny, tiny)).toMatch(/Neither of you/);
  });

  it('calls two equal asks evenly carried', () => {
    const a = findPath(P.Elena, FRIENDSHIP, TOUCH);
    const b = findPath(P.Sofia, FRIENDSHIP, TOUCH);
    expect(symmetryLine(a, b)).toMatch(/about the same size/);
  });

  it('names an asymmetry plainly, in both orders', () => {
    const big = findPath(P.Elena, FRIENDSHIP, TOUCH);
    const small = findPath(P.Elena, TENDER, { x: 0.55, y: 0.56 });
    expect(symmetryLine(big, small)).toMatch(/bigger move/);
    expect(symmetryLine(small, big)).toMatch(/bigger move/);
  });
});
