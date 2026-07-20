import React, { useEffect, useRef } from 'react';
import { generateReading, scoreBand } from '../data/interpretation.js';
import { SCIENCE_MAP, SCIENCE_TIERS } from '../data/scienceMap.js';
import { record } from '../data/journey.js';

/**
 * "The Science Behind Your Reading" — a personalized, per-dimension view of how
 * each of the reader's scores maps onto a real psychological construct, what
 * they'd gain from exploring it, and a link to the source. Honesty tiers make
 * clear how strong each grounding actually is.
 */
export default function ScienceReading({ params, focusIndex, onBack }) {
  const reading = generateReading(params);
  const focusRef = useRef(null);

  useEffect(() => {
    record('content_page_view', { page: 'science', ...(focusIndex != null ? { dimension: focusIndex } : {}) });
  }, [focusIndex]);

  useEffect(() => {
    if (focusIndex != null && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusIndex]);

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingTop: '1.5rem' }}>
      {onBack && (
        <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '1.25rem' }}>
          Back
        </button>
      )}

      <h1 style={{ fontSize: '1.9rem', marginBottom: '0.4rem' }}>The Science Behind Your Reading</h1>
      <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '1rem' }}>
        Most of these dimensions map onto constructs psychologists actually study. Here's how
        <em> your</em> scores read in those frameworks — and where the research is solid,
        related, or genuinely our own. This is a reflection tool, not a clinical instrument;
        the links go to the real work if you want to dig in.
      </p>

      {/* Honesty legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.75rem' }}>
        {Object.entries(SCIENCE_TIERS).map(([key, t]) => (
          <span key={key} title={t.blurb} style={tierBadgeStyle}>{t.label}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {reading.map((item, i) => {
          const sci = SCIENCE_MAP[i];
          if (!sci) return null;
          const band = scoreBand(item.value);
          const focused = i === focusIndex;
          return (
            <div
              key={i}
              ref={focused ? focusRef : null}
              className="card"
              style={{
                padding: '1.1rem 1.25rem',
                border: focused ? '1px solid var(--color-accent)' : undefined,
                boxShadow: focused ? '0 0 0 3px rgba(127,119,221,0.15)' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>{item.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {Math.round(item.value * 100)}%
                </span>
              </div>

              <p style={{ fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '0.5rem' }}>
                Your score maps to <strong>{sci.instrument}</strong> ({sci.construct}) as{' '}
                <em>{sci.maps[band]}</em>.
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
                <a
                  href={sci.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-accent)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  {sci.source.label} ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
