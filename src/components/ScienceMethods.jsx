import React, { useEffect } from 'react';
import { PARAM_LABELS } from '../data/interpretation.js';
import { SCIENCE_MAP, SCIENCE_TIERS } from '../data/scienceMap.js';
import { ARTICLE_URL } from '../data/articleContent.js';
import { record } from '../data/journey.js';

/**
 * The public, non-personalized deep dive into where the 13 dimensions came
 * from, how strong the grounding for each one actually is, where the model
 * is weakest, and what would actually confirm or refute it. Expands on the
 * "Science (and its limits)" summary in AboutSection — no assessment result
 * required to read this.
 */
export default function ScienceMethods({ onBack, onEngine }) {
  useEffect(() => {
    record('content_page_view', { page: 'methods' });
  }, []);

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingTop: '1.5rem' }}>
      {onBack && (
        <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
          Back
        </button>
      )}

      <h1 style={{ fontSize: '1.9rem', marginBottom: '0.5rem' }}>The Science, In Detail</h1>
      <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.75, marginBottom: '2rem' }}>
        This is the expanded version of "The Science (and its limits)" — what the thirteen
        dimensions actually draw on, how strong each connection really is, where the model is
        weakest, and what would genuinely prove or disprove it. None of this is required
        reading to use Love Landscape; it's here for anyone who wants to see the work.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: 1.75 }}>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Where the thirteen dimensions came from</h2>
          <div style={{ color: 'var(--color-text-muted)' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              None of this came from crunching data. Each dimension started as a question: is
              there an established construct in relationship or personality psychology close to
              this idea? Where the answer was yes, that construct's own literature shaped the
              questions and how a low, mid, or high score should read — attachment security
              borrows the anxiety/avoidance model behind the ECR-R; the need for structure and
              tolerance of ambiguity come from the Need for Closure literature; playfulness from
              the OLIW model of adult play.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              That's a real form of evidence — psychologists call it <strong>content
              validity</strong>: the case that an instrument looks like, and is built from, the
              thing it claims to measure. It's the kind of evidence you can establish by careful
              reading and reasoning. It is not the kind of evidence that comes from watching the
              instrument perform on real people, which is a separate question this page comes
              back to below.
            </p>
            <p>
              One dimension broke that pattern. <em>Tender middle</em> — the space between
              friendship and romance — has essentially no dedicated instrument to borrow from.
              It's the one part of this model that's genuinely ours, built from{' '}
              <a href={ARTICLE_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                the essay this project grew out of
              </a>{' '}
              rather than from prior research. That's named honestly in the table below, not
              quietly folded in with the rest.
            </p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>How grounded is each dimension</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.9rem' }}>
            Every dimension is labeled with how strong its connection to real research actually
            is — from "grounded in a validated instrument" down to "our own contribution." The
            labels are the honest version, not the flattering one.
          </p>
          {onEngine && (
            <p style={{ marginBottom: '1.1rem' }}>
              <button onClick={onEngine} style={linkStyle}>
                Or skip the prose — explore the live weight matrix and try your own answers →
              </button>
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
            {Object.entries(SCIENCE_TIERS).map(([key, t]) => (
              <span key={key} title={t.blurb} style={tierBadgeStyle}>{t.label}</span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {SCIENCE_MAP.map((sci, i) => {
              const label = PARAM_LABELS[i];
              if (!label) return null;
              return (
                <div key={i} className="card" style={{ padding: '1.1rem 1.25rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)', marginBottom: '0.3rem' }}>
                    {label.name}
                  </h3>
                  <p style={{ fontSize: '0.87rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '0.55rem' }}>
                    {label.definition}
                  </p>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '0.5rem' }}>
                    Draws on <strong>{sci.instrument}</strong> ({sci.construct}).
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: sci.caveat ? '0.4rem' : '0.7rem' }}>
                    {sci.whatYoudLearn}
                  </p>
                  {sci.caveat && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic', opacity: 0.85, marginBottom: '0.7rem' }}>
                      Note: {sci.caveat}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span title={SCIENCE_TIERS[sci.tier].blurb} style={tierBadgeStyle}>
                      {SCIENCE_TIERS[sci.tier].label}
                    </span>
                    <a href={sci.source.url} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, fontSize: '0.78rem' }}>
                      {sci.source.label} ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>What "correct" would even mean</h2>
          <div style={{ color: 'var(--color-text-muted)' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              Psychologists ask two separate questions about an instrument like this, and it's
              worth naming both so the claims above don't sound stronger than they are.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Reliability</strong> asks whether it's consistent — would you get a similar
              score if you retook it next week, or if the same idea were asked a different way?
              <strong> Validity</strong> asks whether it measures the thing it claims to, and
              only that thing — which splits further into whether it merely looks right
              (content validity, described above), whether statistical analysis of real answers
              actually recovers thirteen separate dimensions rather than a handful of bigger
              ones (construct validity), whether it agrees with an established instrument
              measuring the same construct (convergent validity), and whether it predicts
              anything real, like relationship satisfaction (criterion validity).
            </p>
            <p>
              Right now, this model has the first kind of evidence — content validity — and
              nothing past it. No factor analysis has been run on real submitted answers. No one
              has retaken it weeks apart to check stability. No one has compared it side by side
              with the real ECR-R, the real Need for Closure Scale, or the real SOI-R. That's not
              a hidden flaw; it's the honest current state, and the last section on this page is
              about closing that gap.
            </p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Dimensions vs. archetypes — why terrain, not types</h2>
          <div style={{ color: 'var(--color-text-muted)' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              The comparison people reach for here is the Myers-Briggs — sixteen boxes everyone
              gets sorted into. What actually undermines an instrument like that isn't having
              named categories; it's <em>forcing</em> a hard cut through what the data shows is a
              smooth, continuous spread, so people near a boundary get sorted unstably and the
              "types" don't behave like real, separate kinds. That critique has been formalized
              statistically — the same kind of analysis (taxometrics) applied to adult attachment
              found it, too, is genuinely continuous rather than a small set of discrete styles,
              and yet attachment research still talks in "secure," "anxious," and "avoidant" as
              useful names for <em>regions</em> of that continuum, not as separate boxes.
            </p>
            <p>
              This model is built the same way on purpose: the thirteen numbers are the actual
              measurement, and an archetype is just the nearest recognizable neighborhood in that
              space — never a hard-edged box, and never presented without the full terrain
              underneath it. It's a real design choice, not a hedge, and it's the reason your
              landscape can sit between two archetypes instead of being forced into one.
            </p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Where this is weakest, honestly</h2>
          <div style={{ color: 'var(--color-text-muted)' }}>
            <ul style={{ paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li>
                <strong>Too few questions per dimension.</strong> Real validated scales tend to
                use seven to fifteen items per construct; this uses two to five. That's not
                enough to honestly claim measurement-grade precision — which is exactly why the
                app calls this a structured reflection, never a psychometric test.
              </li>
              <li>
                <strong>Hand-picked weights, not fitted ones.</strong> How much each answer moves
                each dimension is an informed editorial estimate, not a coefficient derived by
                fitting a model to real outcomes.
              </li>
              <li>
                <strong>A few dimensions blend together things their source research keeps
                separate</strong> — attachment <em>anxiety</em> and <em>avoidance</em> collapse
                into one security score, even though the ECR-R treats them as two independent
                axes that behave differently. Self-<em>reflection</em> and self-<em>insight</em>{' '}
                collapse into "mapped territory," even though the research they're drawn from
                finds reflection tracks with anxiety while insight tracks with wellbeing — so a
                high score here means "explored," not "healthier."
              </li>
              <li>
                <strong>Even the "gold standard" instruments this model leans on aren't beyond
                question.</strong> The conflict-style research it draws from (the Rahim ROCI-II)
                has a contested factor structure in its own literature. That's not a reason to
                distrust everything here — it's a reminder that "validated instrument" is a
                matter of degree even in published psychology, not a stamp of certainty.
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>How we'd actually find out</h2>
          <div style={{ color: 'var(--color-text-muted)' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              Content validity — the case made above — is the evidence you can gather from a
              desk and a literature search. Everything past it needs real data, and here's the
              order it would actually happen in:
            </p>
            <ol style={{ paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Test-retest.</strong> For people who create an account and retake it later, do their scores and archetypes stay stable, the way attachment research finds ~85% shared variance over three weeks?</li>
              <li><strong>A convergent-validity study.</strong> Invite a volunteer subset to also take the real NFCS, ECR-R, SOI-R, and a short playfulness measure, then check whether the matching Love Landscape dimensions actually correlate with them. This is the single most direct way to find out if the mapping holds up, and it's the next concrete step.</li>
              <li><strong>Structural analysis on contributed data.</strong> Once enough anonymous research-opt-in submissions exist, run factor analysis to see whether thirteen dimensions really behave as thirteen separate things or collapse into fewer — and check whether the archetypes look anything like the natural clusters the data actually forms.</li>
            </ol>
            <p style={{ marginTop: '0.75rem' }}>
              Everything after the first stage needs the anonymous, opt-in research contribution
              described in Privacy — nobody is defaulted into it, and no individual answers are
              ever part of it, only anonymous parameter vectors.
            </p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.6rem' }}>Read it yourself</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
            The sources cited above, plus a few that shaped the reasoning on this page without
            being tied to one dimension:
          </p>
          <ul style={{ paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {FURTHER_READING.map((s) => (
              <li key={s.url} style={{ fontSize: '0.87rem' }}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>{s.label} ↗</a>
                {s.note && <span style={{ color: 'var(--color-text-muted)' }}> — {s.note}</span>}
              </li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  );
}

const FURTHER_READING = [
  {
    label: 'Fraley, Hudson, Heffernan & Segal (2015) — taxometrics of adult attachment',
    url: 'http://nathanwhudson.com/vita/pdf/Fraley%20et%20al.,%202015.pdf',
    note: 'the analysis behind "attachment is continuous, not categorical"',
  },
  {
    label: 'Stein & Swan (2019) — a critical evaluation of MBTI theory',
    url: 'https://swanpsych.com/publications/SteinSwanMBTITheory_2019.pdf',
    note: 'what actually breaks a typology-from-continuous-data instrument',
  },
  {
    label: 'Eisinga, Grotenhuis & Pelzer (2013) — reliability of two-item scales',
    url: 'https://www.researchgate.net/publication/232610246',
    note: 'why thin, few-item dimensions need to be read with caution',
  },
];

const linkStyle = {
  color: 'var(--color-accent)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

const tierBadgeStyle = {
  display: 'inline-block',
  fontSize: '0.64rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  padding: '2px 7px',
  borderRadius: '5px',
  background: 'rgba(127,119,221,0.1)',
  color: 'var(--color-accent)',
  whiteSpace: 'nowrap',
};
