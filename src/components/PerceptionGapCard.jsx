import React, { useState, useEffect } from 'react';
import RadarView from './RadarView.jsx';
import ReadingRenderer from './ReadingRenderer.jsx';
import { computePerceptionGap, buildPerceptionNarrative, perceptionToMarkdown, CLOSE_ENOUGH, WIDE_GAP } from '../data/perception.js';
import { getPerception, clearPerception } from '../data/perceptions.js';
import { record } from '../data/journey.js';

/**
 * How well do you actually know them?
 *
 * You answer the nineteen questions as you think they would; the result is
 * held against their own answers, dimension by dimension.
 *
 * Deliberately **not scored**. A percentage here would be a number about how
 * well somebody knows their partner, which is both irresistible to share and
 * impossible to hear well — and it would imply a precision that one or two
 * items per dimension cannot support. Bands and words instead.
 */
export default function PerceptionGapCard({ partnerParams, partnerCode, partnerName, onStart }) {
  const [perception, setPerception] = useState(null);
  const [confirmRetake, setConfirmRetake] = useState(false);

  useEffect(() => {
    setPerception(getPerception(partnerCode));
    setConfirmRetake(false);
  }, [partnerCode]);

  useEffect(() => {
    if (perception) record('content_page_view', { page: 'perception-gap' });
  }, [perception]);

  if (!partnerParams || !partnerCode) return null;
  const them = partnerName || 'them';

  if (!perception) {
    return (
      <section style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>How well do you know them?</h3>
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '0.9rem' }}>
            Answer the same nineteen questions as you think {them} would answer them. Held against
            what {partnerName ? `${partnerName} actually said` : 'they actually said'}, it shows which parts of {them} you
            read accurately and which parts you have been guessing at.
          </p>
          <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '1rem' }}>
            Your answers stay on this device. {partnerName || 'They'} will never see them, and there
            is nothing here to send.
          </p>
          <button className="btn-primary" onClick={onStart}>
            Answer as {them}
          </button>
        </div>
      </section>
    );
  }

  const gap = computePerceptionGap(perception.params, partnerParams);
  if (!gap) return null;
  const narrative = buildPerceptionNarrative(gap, partnerName);

  return (
    <section style={{ marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>How well do you know them?</h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '1rem' }}>
        Your picture of {them}, drawn over {partnerName ? `${partnerName}'s` : 'their'} own.
      </p>

      {/* The two landscapes overlaid: where the shapes part company is the
          point. The chart's own legend is relabelled rather than hidden and
          replaced — two legends naming the same two colours differently is
          worse than none, and the default "Yours" would name the wrong thing:
          this series is your guess about them, not your own landscape. */}
      <RadarView
        params={perception.params}
        partnerParams={partnerParams}
        view="combined"
        seriesLabels={{
          yours: 'Your picture of them',
          theirs: partnerName ? `${partnerName}'s own answers` : 'Their own answers',
        }}
      />

      <DimensionBars gap={gap} />

      <div style={{ marginTop: '1.25rem' }}>
        <ReadingRenderer text={perceptionToMarkdown(narrative)} />
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
        {confirmRetake ? (
          <div style={{ display: 'inline-flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              This replaces your current answers about {them}.
            </span>
            <button
              className="btn-primary"
              onClick={() => { clearPerception(partnerCode); setPerception(null); onStart(); }}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
            >
              Answer again
            </button>
            <button className="btn-secondary" onClick={() => setConfirmRetake(false)} style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={() => setConfirmRetake(true)} style={{ fontSize: '0.82rem' }}>
            Answer again
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * One row per dimension: which side of their own answer you fell on, and by
 * how much. The bar is centred on their answer rather than on zero, because
 * the question is not how big the number is but which way you were wrong.
 */
function DimensionBars({ gap }) {
  // Deliberately not the chart's green: that green already means "their own
  // answers" in the legend directly above, and one colour with two meanings in
  // one card is how a reader learns to distrust both. A match is neutral here;
  // the encouraging reading of it belongs in the words, not the bar.
  const TONE = {
    close: { color: 'var(--color-text-muted)', word: 'matched' },
    off: { color: '#e0a23c', word: 'a little off' },
    wide: { color: '#f97066', word: 'wide' },
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {gap.dimensions.map((d) => {
        const tone = TONE[d.band];
        // Half-width track each side; a full-width gap is the whole scale.
        const magnitude = Math.min(1, d.size / (WIDE_GAP * 2)) * 50;
        return (
          <div key={d.index} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ flex: '0 0 8.5rem', fontSize: '0.76rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
              {d.name}
            </span>
            <span style={{ position: 'relative', flex: 1, height: '10px', background: 'var(--color-border-subtle)', borderRadius: '5px' }}>
              <span style={{ position: 'absolute', left: '50%', top: '-2px', bottom: '-2px', width: '1px', background: 'var(--color-border)' }} />
              <span style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                borderRadius: '5px',
                background: tone.color,
                opacity: d.band === 'close' ? 0.55 : 0.85,
                left: d.delta >= 0 ? '50%' : `${50 - magnitude}%`,
                width: `${Math.max(magnitude, 1.5)}%`,
              }} />
            </span>
            <span style={{ flex: '0 0 6.5rem', fontSize: '0.72rem', color: tone.color }}>
              {d.band === 'close' ? tone.word : d.direction === 'over' ? 'you read higher' : 'you read lower'}
            </span>
          </div>
        );
      })}
      <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.4rem', lineHeight: 1.6 }}>
        Centre line is their own answer. Left means you read them lower than they describe
        themselves, right means higher. Anything within {Math.round(CLOSE_ENOUGH * 100)} points
        counts as matched — the questions are not precise enough to call a smaller difference a
        misreading.
      </p>
    </div>
  );
}
