import React from 'react';

export default function IntroScreen({ onBegin, onLoadCode, onAbout, hasSavedResult, onContinue }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: '3.5rem' }}>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>
        The Shape of Intimacy
      </h1>
      <p style={{
        color: 'var(--color-text-muted)',
        maxWidth: '480px',
        margin: '0 auto 2.5rem',
        fontSize: '1.05rem',
        lineHeight: 1.7,
      }}>
        A 17-question assessment that maps your relational openness onto a 3D terrain.
        See where your relationships naturally settle — and where the ridges are.
        Based on <a href="https://bayesianpersuasion.com/posts/the-shape-of-intimacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>The Shape of Intimacy</a>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <button className="btn-primary" onClick={onBegin}>
          Begin Assessment
        </button>

        {hasSavedResult && (
          <button className="btn-primary" onClick={onContinue} style={{
            background: 'transparent',
            color: 'var(--color-accent)',
            border: '1.5px solid var(--color-accent)',
          }}>
            View Your Last Result
          </button>
        )}

        <button
          className="btn-secondary"
          onClick={onLoadCode}
          style={{ fontSize: '0.85rem' }}
        >
          I already have a code
        </button>
      </div>

      <div style={{
        marginTop: '3rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        color: 'var(--color-text-muted)',
        fontSize: '0.8rem',
      }}>
        <Feature icon="17" label="questions" />
        <Feature icon="3D" label="terrain" />
        <Feature icon="0" label="data collected" />
      </div>

      <button
        onClick={onAbout}
        style={{
          marginTop: '2rem',
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
        }}
      >
        How does this work?
      </button>
    </div>
  );
}

function Feature({ icon, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: '1.1rem',
        color: 'var(--color-accent)',
      }}>
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}
