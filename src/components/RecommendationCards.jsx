import React from 'react';
import { DISCLAIMER } from '../data/recommendations.js';

const TYPE_STYLES = {
  shared:       { bg: 'rgba(45, 212, 168, 0.12)', color: '#2dd4a8', label: 'Shared ground' },
  boundary:     { bg: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa', label: 'Mutual boundary' },
  conversation: { bg: 'rgba(249, 112, 102, 0.12)', color: '#f97066', label: 'Conversation point' },
  frontier:     { bg: 'rgba(244, 114, 182, 0.12)', color: '#f472b6', label: 'Shared frontier' },
};

export default function RecommendationCards({ recommendations }) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Conversation Map</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {recommendations.map((rec, i) => {
          const style = TYPE_STYLES[rec.type] || TYPE_STYLES.conversation;
          return (
            <div key={i} className="card" style={{ padding: '1rem 1.25rem' }}>
              <span style={{
                display: 'inline-block',
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 8px',
                borderRadius: '6px',
                background: style.bg,
                color: style.color,
                marginBottom: '0.5rem',
              }}>
                {style.label}
              </span>
              <h4 style={{ fontSize: '1rem', fontFamily: 'var(--font-heading)', marginBottom: '0.35rem' }}>
                {rec.title}
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                {rec.text}
              </p>
            </div>
          );
        })}
      </div>

      <p style={{
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
        fontStyle: 'italic',
        marginTop: '1.5rem',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        {DISCLAIMER}
      </p>
    </div>
  );
}
