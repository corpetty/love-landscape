import React, { useState } from 'react';

export default function CodeDisplay({ code, onShareLink }) {
  const [copied, setCopied] = useState('');

  async function handleCopy(type) {
    let text = code;
    if (type === 'link') {
      const url = new URL(window.location.href);
      url.searchParams.set('code', code);
      text = url.toString();
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      padding: '0.85rem 1rem',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          Your code:
        </span>
        <code style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.05rem',
          fontWeight: 600,
          letterSpacing: '0.03em',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {code}
        </code>
        <button
          className="btn-secondary"
          onClick={() => handleCopy('code')}
          aria-label="Copy code"
          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}
        >
          {copied === 'code' ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.5rem',
        paddingTop: '0.5rem',
        borderTop: '1px solid var(--color-border-subtle)',
      }}>
        <button
          className="btn-secondary"
          onClick={() => handleCopy('link')}
          style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
        >
          {copied === 'link' ? 'Link copied!' : 'Copy shareable link'}
        </button>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          Share this link so others can see your landscape
        </span>
      </div>
    </div>
  );
}
