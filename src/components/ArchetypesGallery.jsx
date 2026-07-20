import React, { useEffect, useRef, useState } from 'react';
import { ARCHETYPES } from '../data/archetypes.js';
import { record } from '../data/journey.js';

/**
 * Public gallery of all ten terrain archetypes — a browsable marketing surface.
 * `focusKey` (from /a/<key>) scrolls to and highlights one type. Each card links
 * to its own shareable /a/<key> page and into the assessment.
 */
export default function ArchetypesGallery({ focusKey, onTakeAssessment, onBack }) {
  const focusRef = useRef(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    record('content_page_view', { page: 'archetypes', ...(focusKey ? { archetype: focusKey } : {}) });
  }, [focusKey]);

  useEffect(() => {
    if (focusKey && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusKey]);

  function shareType(key) {
    const url = `${window.location.origin}/a/${key}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    }).catch(() => {});
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingTop: '1.5rem' }}>
      {onBack && (
        <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '1.25rem' }}>
          Back
        </button>
      )}

      <h1 style={{ fontSize: '1.9rem', marginBottom: '0.4rem' }}>The Ten Terrains</h1>
      <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, marginBottom: '1.75rem' }}>
        Every relational landscape settles near one of ten recognizable shapes. These aren't
        boxes — they're the nearest <em>region</em> of a continuous terrain. Find the one that
        sounds like you, then take the assessment to map your own.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {ARCHETYPES.map((a) => {
          const focused = a.key === focusKey;
          return (
            <div
              key={a.key}
              ref={focused ? focusRef : null}
              className="card"
              style={{
                padding: '1.25rem 1.35rem',
                border: focused ? '1px solid var(--color-accent)' : undefined,
                boxShadow: focused ? '0 0 0 3px rgba(127, 119, 221, 0.15)' : undefined,
              }}
            >
              <h3 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-heading)', marginBottom: '0.1rem' }}>
                {a.name}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '0.7rem' }}>
                {a.epithet} — {a.essence}
              </p>
              <p style={{ fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '1rem' }}>
                {a.description}
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={onTakeAssessment} style={{ fontSize: '0.85rem' }}>
                  Find your terrain
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => shareType(a.key)}
                  style={{ fontSize: '0.85rem' }}
                >
                  {copied === a.key ? 'Link copied ✓' : 'Share this type'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
