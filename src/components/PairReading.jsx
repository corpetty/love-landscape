import React, { useState } from 'react';
import { loadLLMConfig, pairReading } from '../data/llmClient.js';

export default function PairReading({ params, partnerParams, onOpenSettings }) {
  const [reading, setReading] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const config = loadLLMConfig();

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const result = await pairReading(config, params, partnerParams);
      setReading(result.reading);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (reading) {
    return (
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>AI Pair Reading</h3>
        <div className="card" style={{ padding: '1rem 1.15rem' }}>
          <div style={{
            fontSize: '0.9rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
          }}>
            {reading}
          </div>
          <button
            className="btn-secondary"
            onClick={handleGenerate}
            style={{ fontSize: '0.75rem', marginTop: '0.75rem' }}
          >
            Regenerate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {!config ? (
        <div style={{
          textAlign: 'center',
          padding: '0.75rem',
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem',
        }}>
          <button
            onClick={onOpenSettings}
            style={{
              color: 'var(--color-accent)',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              fontSize: '0.85rem',
            }}
          >
            Configure an LLM
          </button>
          {' '}for an AI-powered reading of your combined landscapes.
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          {error && (
            <p role="alert" style={{
              color: '#f97066',
              fontSize: '0.8rem',
              marginBottom: '0.5rem',
              padding: '0.5rem',
              background: 'rgba(249,112,102,0.08)',
              borderRadius: '6px',
            }}>
              {error}
            </p>
          )}
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
            style={{
              fontSize: '0.9rem',
              opacity: loading ? 0.6 : 1,
              background: 'transparent',
              color: 'var(--color-accent)',
              border: '1.5px solid var(--color-accent)',
            }}
          >
            {loading ? 'Generating pair reading...' : 'Get AI Pair Reading'}
          </button>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            marginTop: '0.35rem',
            opacity: 0.6,
          }}>
            Using {config.provider}{config.model ? ` / ${config.model}` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
