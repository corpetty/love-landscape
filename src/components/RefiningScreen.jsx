import React from 'react';

export default function RefiningScreen({ onSkip }) {
  return (
    <div style={{
      textAlign: 'center',
      paddingTop: '6rem',
      maxWidth: '400px',
      margin: '0 auto',
    }}>
      {/* Animated dots */}
      <div style={{
        fontSize: '2rem',
        marginBottom: '1.5rem',
        color: 'var(--color-accent)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
          @keyframes dotBounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-8px); }
          }
        `}</style>
        <span style={{ display: 'inline-block', animation: 'dotBounce 1.4s ease-in-out infinite' }}>●</span>
        <span style={{ display: 'inline-block', animation: 'dotBounce 1.4s ease-in-out 0.2s infinite', margin: '0 0.3rem' }}>●</span>
        <span style={{ display: 'inline-block', animation: 'dotBounce 1.4s ease-in-out 0.4s infinite' }}>●</span>
      </div>

      <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>
        Refining your landscape
      </h2>

      <p style={{
        color: 'var(--color-text-muted)',
        fontSize: '0.95rem',
        lineHeight: 1.7,
        marginBottom: '2rem',
      }}>
        Your context is being interpreted to adjust your terrain parameters
        for a more accurate landscape.
      </p>

      <button
        className="btn-secondary"
        onClick={onSkip}
        style={{ fontSize: '0.85rem' }}
      >
        Skip — use base values
      </button>
    </div>
  );
}
