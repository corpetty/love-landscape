import React from 'react';

/** The default promise: assessment answers are derived on-device into a code. */
const DEFAULT_PRIVACY_NOTE = 'Your answers never leave your device. Anonymous usage counts only.';

/**
 * @param {string} [props.privacyNote] Override for screens where the default
 *   claim is not true. The growth-journey ask screen is the case that forced
 *   this: an answer there is sent to the person who asked, so a footer saying
 *   nothing leaves the device would be a false promise on the one screen where
 *   a stranger is deciding whether to trust us with something personal.
 */
export default function Footer({ onAbout, onMethods, privacyNote = DEFAULT_PRIVACY_NOTE }) {
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
        {onMethods && (
          <>
            <span style={{ opacity: 0.3 }}>|</span>
            <button
              onClick={onMethods}
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              The science
            </button>
          </>
        )}
        <span style={{ opacity: 0.3 }}>|</span>
        <span>{privacyNote}</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <a
          href="/privacy.html"
          style={{
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          Privacy
        </a>
      </div>
    </footer>
  );
}
