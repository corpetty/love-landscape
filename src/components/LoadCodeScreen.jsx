import React, { useState } from 'react';
import { decodeParams } from '../data/encoding.js';

export default function LoadCodeScreen({ onLoad, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function handleLoad() {
    const params = decodeParams(code);
    if (!params) {
      setError('Invalid code. Codes start with L1_ or L2_ followed by encoded characters.');
      return;
    }
    onLoad(params);
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', paddingTop: '3rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Load a landscape code</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Paste the code you received to view a landscape.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
          placeholder="L1_... or L2_..."
          style={{
            flex: 1,
            padding: '0.65rem 0.85rem',
            borderRadius: '6px',
            border: `1px solid ${error ? '#f97066' : 'var(--color-border)'}`,
            background: 'var(--color-bg-card)',
            fontFamily: 'var(--font-mono)',
            fontSize: '1rem',
          }}
        />
        <button className="btn-primary" onClick={handleLoad}>
          Load
        </button>
      </div>

      {error && (
        <p style={{ color: '#f97066', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>
      )}

      <button className="btn-secondary" onClick={onBack} style={{ marginTop: '1rem' }}>
        Back
      </button>
    </div>
  );
}
