import React, { useState } from 'react';
import { getEffectiveConfig, chatCompletion } from '../data/llmClient.js';
import { buildReadingPrompt } from '../data/llmPrompt.js';

/**
 * @param {Object}   props
 * @param {number[]} props.params
 * @param {Object}   props.contextAnswers
 * @param {Function} props.onOpenSettings
 * @param {Function} [props.onReadingGenerated] - Called with (readingText) when a reading is produced
 */
export default function EnhancedReading({ params, contextAnswers, onOpenSettings, onReadingGenerated }) {
  const [reading, setReading]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [noCredits, setNoCredits] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setNoCredits(false);

    try {
      const config = getEffectiveConfig();
      const { systemMessage, userMessage } = buildReadingPrompt(params, contextAnswers);
      const result = await chatCompletion(config, systemMessage, userMessage, 'read');
      setReading(result);
      onReadingGenerated?.(result);
    } catch (err) {
      if (err.code === 'NO_CREDITS') {
        setNoCredits(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (reading) {
    return (
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>AI Reading</h3>
        <div className="card" style={{ padding: '1rem 1.15rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
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
    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
      {noCredits ? (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '8px',
          background: 'rgba(249,112,102,0.08)', border: '1px solid rgba(249,112,102,0.2)',
          fontSize: '0.85rem', color: 'var(--color-text-muted)',
        }}>
          No reading credits remaining.{' '}
          <button onClick={onOpenSettings} style={{ color: 'var(--color-accent)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Get more in settings
          </button>
        </div>
      ) : error ? (
        <>
          <p role="alert" style={{
            color: '#f97066', fontSize: '0.8rem',
            marginBottom: '0.5rem', padding: '0.5rem',
            background: 'rgba(249,112,102,0.08)', borderRadius: '6px',
          }}>
            {error}
          </p>
          <button className="btn-primary" onClick={handleGenerate} style={{ fontSize: '0.9rem' }}>
            Try again
          </button>
        </>
      ) : (
        <>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
            style={{
              fontSize: '0.9rem', opacity: loading ? 0.6 : 1,
              background: 'transparent', color: 'var(--color-accent)',
              border: '1.5px solid var(--color-accent)',
            }}
          >
            {loading ? 'Generating reading…' : 'Get AI Reading'}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', opacity: 0.6 }}>
            Powered by Love Landscape AI ·{' '}
            <button onClick={onOpenSettings} style={{ color: 'var(--color-accent)', textDecoration: 'underline', textUnderlineOffset: '2px', fontSize: '0.75rem' }}>
              settings
            </button>
          </p>
        </>
      )}
    </div>
  );
}
