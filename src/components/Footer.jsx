import React from 'react';

export default function Footer({ onAbout, onSettings }) {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '2rem 1rem 1.5rem',
      borderTop: '1px solid var(--color-border-subtle)',
      marginTop: '2rem',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1.5rem',
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
      }}>
        <button
          onClick={onAbout}
          style={{
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          How it works
        </button>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>No data collected. Everything stays on your device.</span>
        {onSettings && (
          <>
            <span style={{ opacity: 0.3 }}>|</span>
            <button
              onClick={onSettings}
              title="LLM Settings"
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-text-muted)',
                opacity: 0.6,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
            >
              ⚙
            </button>
          </>
        )}
      </div>
    </footer>
  );
}
