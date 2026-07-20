import React, { useState } from 'react';
import { computeArchetype } from '../data/archetypes.js';
import { generateCompatibility } from '../data/recommendations.js';
import { getComparisonName, setComparisonName } from '../data/comparisons.js';

/**
 * The compatibility headline shown when two landscapes are compared: the archetype
 * pairing + a free, instant alignment snapshot. This is the hook that frames the
 * (paid) deep compatibility report and the free Conversation Map below it.
 */
export default function PairCompatibility({ params, partnerParams, code, partnerCode }) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(() => (partnerCode ? getComparisonName(partnerCode) : null));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const a = computeArchetype(params)?.archetype;
  const b = computeArchetype(partnerParams)?.archetype;
  const compat = generateCompatibility(params, partnerParams);
  if (!a || !b || !compat) return null;

  function saveName() {
    const v = draft.trim();
    setComparisonName(partnerCode, v);
    setName(v || null);
    setEditing(false);
  }

  function shareComparison() {
    if (!code || !partnerCode) return;
    const url = `${window.location.origin}/?code=${encodeURIComponent(code)}&compare=${encodeURIComponent(partnerCode)}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="card" style={{ padding: '1.4rem 1.35rem', marginBottom: '1.25rem', textAlign: 'center' }}>
      {/* Nameable comparison label */}
      {partnerCode && (
        <div style={{ marginBottom: '0.6rem' }}>
          {editing ? (
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false); }}
                placeholder="e.g. Alex, Mom, Jordan"
                maxLength={40}
                style={{
                  padding: '0.3rem 0.6rem', borderRadius: '6px',
                  border: '1px solid var(--color-border)', background: 'var(--color-bg-card)',
                  fontSize: '0.85rem', minWidth: 0, flex: '0 1 200px',
                }}
              />
              <button className="btn-secondary" onClick={saveName} style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}>Save</button>
            </div>
          ) : (
            <button
              onClick={() => { setDraft(name || ''); setEditing(true); }}
              style={{ fontSize: '0.85rem', color: name ? 'var(--color-text)' : 'var(--color-accent)', fontWeight: name ? 600 : 400 }}
              title="Name this comparison"
            >
              {name ? `📌 ${name}` : '＋ Name this comparison'}
            </button>
          )}
        </div>
      )}

      <span style={{
        display: 'inline-block',
        fontSize: '0.68rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '2px 9px',
        borderRadius: '6px',
        background: 'rgba(127,119,221,0.12)',
        color: 'var(--color-accent)',
        marginBottom: '0.7rem',
      }}>
        Your compatibility
      </span>

      <h3 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-heading)', lineHeight: 1.3, marginBottom: '0.6rem' }}>
        {a.name}{' '}
        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '1rem' }}>meets</span>{' '}
        {b.name}
      </h3>

      <div style={{ fontSize: '2.4rem', fontWeight: 700, color: 'var(--color-accent)', lineHeight: 1 }}>
        {compat.score}%
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem', marginBottom: '0.8rem' }}>
        aligned — how similarly your landscapes are shaped
      </div>

      {(compat.topShared || compat.topTension) && (
        <p style={{ fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--color-text)', marginBottom: code && partnerCode ? '0.9rem' : 0 }}>
          {compat.topShared && <>You settle together most in <strong>{compat.topShared}</strong>. </>}
          {compat.topTension && <>Your steepest conversation is around <strong>{compat.topTension}</strong>.</>}
        </p>
      )}

      {code && partnerCode && (
        <button className="btn-secondary" onClick={shareComparison} style={{ fontSize: '0.8rem' }}>
          {copied ? 'Link copied ✓' : 'Share this comparison'}
        </button>
      )}
    </div>
  );
}
