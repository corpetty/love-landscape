import React from 'react';
import { computeArchetype } from '../data/archetypes.js';

/**
 * The shareable "terrain type" card — the viral unit ("I'm an Archipelago").
 * Renders the nearest archetype to a 13-param landscape, plus a subtle
 * "with edges of X" line when the runner-up is close (margin < 0.05).
 *
 * Shown above the reading on the owner results screen and the visitor share view.
 */
export default function ArchetypeCard({ params, style }) {
  const result = computeArchetype(params);
  if (!result) return null;
  const { archetype: arch, runnerUp, margin } = result;
  const closeCall = margin < 0.05 && runnerUp;

  return (
    <div className="card" style={{ padding: '1.25rem 1.35rem', ...style }}>
      <span style={{
        display: 'inline-block',
        fontSize: '0.7rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '2px 8px',
        borderRadius: '6px',
        background: 'rgba(127, 119, 221, 0.12)',
        color: 'var(--color-accent)',
        marginBottom: '0.6rem',
      }}>
        Your terrain
      </span>

      <h4 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', marginBottom: '0.15rem' }}>
        {arch.name}
      </h4>
      <p style={{
        fontSize: '0.9rem',
        color: 'var(--color-text-muted)',
        fontStyle: 'italic',
        marginBottom: '0.75rem',
      }}>
        {arch.epithet} — {arch.essence}
      </p>

      <p style={{ fontSize: '0.92rem', lineHeight: 1.7, marginBottom: closeCall ? '0.6rem' : 0 }}>
        {arch.description}
      </p>

      {closeCall && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', opacity: 0.8 }}>
          …with edges of <strong>{runnerUp.name}</strong> — you sit close to the border between the two.
        </p>
      )}
    </div>
  );
}
