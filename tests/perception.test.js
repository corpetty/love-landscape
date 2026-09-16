import { describe, it, expect, beforeEach } from 'vitest';
import {
  computePerceptionGap, buildPerceptionNarrative, perceptionToMarkdown,
  CLOSE_ENOUGH, WIDE_GAP,
} from '../src/data/perception.js';
import { questions, questionsFor, ABOUT_PHRASINGS } from '../src/data/questions.js';
import { computeParams } from '../src/data/paramCompute.js';
import { personas } from '../analysis/personas.js';

const P = (name) => computeParams(personas.find((p) => p.name === name).answers);
const NEUTRAL = Array(13).fill(0.5);
const allText = (n) => n.sections.map((s) => `${s.title}\n${s.text}`).join('\n\n');

describe('questionsFor — the same questions, asked about someone else', () => {
  it('rewords every question', () => {
    const about = questionsFor('about');
    expect(about).toHaveLength(questions.length);
    about.forEach((q, i) => {
      expect(ABOUT_PHRASINGS[q.id], `${q.id} has no about wording`).toBeTruthy();
      expect(q.text).not.toBe(questions[i].text);
    });
  });

  it('never changes an option value, only its wording', () => {
    // The two landscapes are only comparable if the same answer scores the
    // same on both sides. A reworded option that also moved would make every
    // gap partly an artefact of the copy.
    const about = questionsFor('about');
    questions.forEach((q, i) => {
      expect((about[i].options || []).map((o) => o.value)).toEqual((q.options || []).map((o) => o.value));
    });
  });

  it('rewrites every option that spoke in the first person', () => {
    // Options already written about nobody in particular ("Meaningful
    // connections with others enrich a person") read correctly in both modes
    // and should pass through untouched. Only self-referential ones must move.
    const about = questionsFor('about');
    questions.forEach((q, i) => {
      if (!q.options) return;
      q.options.forEach((opt, j) => {
        if (!/\bI\b|\bI'd\b|\bmy\b/.test(opt.label)) return;
        expect(about[i].options[j].label, `${q.id} option ${j}`).not.toBe(opt.label);
      });
    });
  });

  it('leaves a scenario untranslated only when every option is already neutral', () => {
    // q12's options are abstract nouns ("Safety", "Connection") that answer the
    // reworded stem correctly as they stand. Every other scenario speaks from
    // somebody's point of view and has to move.
    const about = questionsFor('about');
    const PERSONAL = /\bI\b|\bI'd\b|\bmy\b|\bme\b/;
    questions.forEach((q, i) => {
      if (!q.options) return;
      const changed = q.options.some((opt, j) => about[i].options[j].label !== opt.label);
      const anyPersonal = q.options.some((opt) => PERSONAL.test(opt.label));
      expect(changed || !anyPersonal, `${q.id} has first-person options but none were reworded`).toBe(true);
    });
  });

  it('asks for a guess rather than a verdict, and never in the first person', () => {
    for (const q of questionsFor('about')) {
      const text = [q.text, q.helperText, ...(q.options || []).map((o) => o.label)].join(' ');
      // "I'd need to set a boundary" asked about someone else is nonsense, and
      // first-person wording is the tell that a question was left untranslated.
      expect(text, q.id).not.toMatch(/\bI'd\b|\bI need\b|\bI feel\b|\bmy own\b/);
    }
  });

  it('returns the untouched questions for the normal mode', () => {
    expect(questionsFor('self')).toBe(questions);
    expect(questionsFor()).toBe(questions);
  });
});

describe('computePerceptionGap', () => {
  it('reports a perfect guess as matched everywhere', () => {
    const gap = computePerceptionGap(P('Elena'), P('Elena'));
    expect(gap.counts.close).toBe(13);
    expect(gap.meanGap).toBe(0);
    expect(gap.widest).toEqual([]);
    expect(gap.overall.key).toBe('close');
  });

  it('keeps the direction of every difference', () => {
    // Over- and under-estimating are opposite mistakes; collapsing them to a
    // magnitude would leave the reading with nothing actionable to say.
    const actual = [...NEUTRAL];
    const perceived = [...NEUTRAL];
    perceived[0] = 0.95; // read much higher
    perceived[1] = 0.05; // read much lower
    const gap = computePerceptionGap(perceived, actual);
    expect(gap.dimensions[0].direction).toBe('over');
    expect(gap.dimensions[0].delta).toBeGreaterThan(0);
    expect(gap.dimensions[1].direction).toBe('under');
    expect(gap.dimensions[1].delta).toBeLessThan(0);
  });

  it('does not call a small difference a misreading', () => {
    // One or two items per dimension cannot support calling noise a mistake.
    const actual = [...NEUTRAL];
    const perceived = [...NEUTRAL];
    perceived[0] = 0.5 + (CLOSE_ENOUGH - 0.01);
    const gap = computePerceptionGap(perceived, actual);
    expect(gap.dimensions[0].band).toBe('close');
    expect(gap.dimensions[0].direction).toBe('match');
  });

  it('bands a difference by size', () => {
    const actual = [...NEUTRAL];
    const perceived = [...NEUTRAL];
    perceived[0] = 0.5 + CLOSE_ENOUGH + 0.01;
    perceived[1] = 0.5 + WIDE_GAP + 0.01;
    const gap = computePerceptionGap(perceived, actual);
    expect(gap.dimensions[0].band).toBe('off');
    expect(gap.dimensions[1].band).toBe('wide');
  });

  it('ranks the widest differences first and caps the list', () => {
    const gap = computePerceptionGap(P('Elena'), P('Amara'));
    expect(gap.widest.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < gap.widest.length; i++) {
      expect(gap.widest[i - 1].size).toBeGreaterThanOrEqual(gap.widest[i].size);
    }
  });

  it('lists as clearly seen only the dimensions that actually matched', () => {
    const gap = computePerceptionGap(P('Elena'), P('Sofia'));
    for (const d of gap.seen) expect(d.band).toBe('close');
  });

  it('moves through every overall band as the guess degrades', () => {
    const keys = new Set();
    for (const shift of [0, 0.15, 0.25, 0.5]) {
      const perceived = NEUTRAL.map((v) => Math.min(1, v + shift));
      keys.add(computePerceptionGap(perceived, NEUTRAL).overall.key);
    }
    expect([...keys].sort()).toEqual(['close', 'distant', 'good', 'partial']);
  });

  it('refuses malformed input instead of throwing', () => {
    expect(computePerceptionGap(null, NEUTRAL)).toBeNull();
    expect(computePerceptionGap(NEUTRAL, 'nope')).toBeNull();
    expect(computePerceptionGap([], [])).toBeNull();
  });

  it('clamps values rather than trusting them', () => {
    const gap = computePerceptionGap([5, ...NEUTRAL.slice(1)], [-3, ...NEUTRAL.slice(1)]);
    expect(gap.dimensions[0].perceived).toBe(1);
    expect(gap.dimensions[0].actual).toBe(0);
  });
});

describe('buildPerceptionNarrative — what it is allowed to say', () => {
  const everyReading = () => {
    const out = [];
    const pairs = [['Elena', 'Elena'], ['Elena', 'Sofia'], ['Elena', 'Amara'], ['Kai', 'Rin'], ['Devi', 'James']];
    for (const [a, b] of pairs) {
      const gap = computePerceptionGap(P(a), P(b));
      out.push(buildPerceptionNarrative(gap, null));
      out.push(buildPerceptionNarrative(gap, 'Robin'));
    }
    return out;
  };

  it('always says the comparison is against their self-account, not the truth', () => {
    // The single most important framing here: a gap is a difference between
    // two accounts, and a reading that implies otherwise accuses someone.
    for (const n of everyReading()) {
      expect(allText(n)).toContain('Neither is the truth');
    }
  });

  it('never blames either person', () => {
    for (const n of everyReading()) {
      const text = allText(n).toLowerCase();
      expect(text).not.toMatch(/you should have|you failed|not paying attention|do not know (them|him|her)|barely know/);
      expect(text).not.toMatch(/they are hiding|being dishonest|lying/);
    }
  });

  it('offers innocent explanations before harder ones, whenever there is a gap', () => {
    const gap = computePerceptionGap(P('Elena'), P('Amara'));
    const n = buildPerceptionNarrative(gap, null);
    const reading = n.sections.find((s) => s.kind === 'reading');
    expect(reading.text).toContain('innocent explanations');
  });

  it('names what each direction of error actually costs', () => {
    const actual = [...NEUTRAL];
    const over = [...NEUTRAL]; over[0] = 1;
    const under = [...NEUTRAL]; under[0] = 0;
    const overText = allText(buildPerceptionNarrative(computePerceptionGap(over, actual), null));
    const underText = allText(buildPerceptionNarrative(computePerceptionGap(under, actual), null));
    expect(overText).not.toBe(underText);
    expect(overText).toMatch(/cannot easily give|not there yet|did not meet/);
    expect(underText).toMatch(/would have welcomed|omission|not being seen/);
  });

  it('does not repeat one sentence across several gaps', () => {
    const gap = computePerceptionGap(P('Elena'), P('Amara'));
    const lines = buildPerceptionNarrative(gap, null)
      .sections.find((s) => s.kind === 'gaps').text.split('\n\n');
    expect(lines.length).toBeGreaterThan(1);
    // Strip the dimension name; what follows must not be identical each time.
    const tails = lines.map((l) => l.replace(/^\*\*[^*]+\*\*\s*/, ''));
    expect(new Set(tails).size).toBe(tails.length);
  });

  it('gives a perfect guess something honest to say instead of praise', () => {
    const n = buildPerceptionNarrative(computePerceptionGap(P('Elena'), P('Elena')), null);
    const reading = n.sections.find((s) => s.kind === 'reading');
    expect(reading.text).toContain('as you would');
  });

  it('keeps every number out of the prose', () => {
    for (const n of everyReading()) expect(allText(n)).not.toMatch(/\d/);
  });

  it('gets pronoun case right in both voices', () => {
    for (const n of everyReading()) {
      const text = allText(n);
      expect(text).not.toMatch(/\bplace they\b/);
      expect(text).not.toMatch(/\bthey describes\b/);
      expect(text).not.toMatch(/\bRobin describe\b/);
    }
  });

  it('always ends with something a person could actually say out loud', () => {
    for (const n of everyReading()) {
      const last = n.sections.at(-1);
      expect(last.kind).toBe('conversations');
      expect(last.text).toContain('“');
    }
  });

  it('returns null rather than half a reading', () => {
    expect(buildPerceptionNarrative(null)).toBeNull();
    expect(perceptionToMarkdown(null)).toBe('');
  });

  it('renders as markdown sections for the shared reading renderer', () => {
    const md = perceptionToMarkdown(buildPerceptionNarrative(computePerceptionGap(P('Elena'), P('Sofia')), null));
    expect(md).toMatch(/^## /);
    expect(md.match(/^## /gm).length).toBeGreaterThanOrEqual(4);
  });
});
