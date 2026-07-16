import React, { useState, useEffect } from 'react';
import {
  getEffectiveConfig, pairReading, getCachedCredits,
} from '../data/llmClient.js';
import ReadingRenderer from './ReadingRenderer.jsx';
import { getSavedReading, saveReading } from '../data/resultsClient.js';

/**
 * The AI pair reading — lives in the compare flow, appears once a partner
 * code is loaded. Persists per (code, partner code) pair so re-loading the
 * same comparison shows the reading instead of a fresh generate button.
 *
 * @param {Object}   props
 * @param {number[]} props.params
 * @param {number[]} props.partnerParams
 * @param {string}   props.code            - Your landscape code (persistence key)
 * @param {string}   props.partnerCode     - Partner's landscape code (persistence key)
 * @param {Function} props.onOpenSettings
 * @param {Function} props.onGetCredits
 * @param {Function} [props.onReadingGenerated] - Called with (readingText) when produced or restored
 */
export default function PairReading({ params, partnerParams, code, partnerCode, onOpenSettings, onGetCredits, onReadingGenerated }) {
  const [reading, setReading]     = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [noCredits, setNoCredits] = useState(false);
  const managed = getEffectiveConfig().provider === 'managed';
  const credits = getCachedCredits();

  // Restore the saved reading whenever the comparison on screen changes.
  useEffect(() => {
    const saved = code && partnerCode ? getSavedReading(code, 'pair', partnerCode) : null;
    setReading(saved?.text || '');
    setGeneratedAt(saved?.created_at || null);
    setError(null);
    if (saved?.text) onReadingGenerated?.(saved.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, partnerCode]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setNoCredits(false);

    try {
      const config = getEffectiveConfig();
      const result = await pairReading(config, params, partnerParams);
      setReading(result.reading);
      setGeneratedAt(Date.now());
      if (code && partnerCode) {
        saveReading({ code, kind: 'pair', partnerCode, text: result.reading });
      }
      onReadingGenerated?.(result.reading);
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

  const costLabel = managed
    ? `1 credit${credits !== null ? ` · ${credits} left` : ''}`
    : 'uses your configured AI provider';

  return (
    <div className="card" style={{ marginTop: '1rem', padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h4 style={{ fontSize: '1rem' }}>AI Pair Reading</h4>
            {reading && (
              <span style={{ fontSize: '0.75rem', color: '#2dd4a8', fontWeight: 600 }}>
                ✓ Generated{generatedAt ? ` ${new Date(generatedAt).toLocaleDateString()}` : ''}
              </span>
            )}
          </div>
          {!reading && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginTop: '0.2rem' }}>
              How your two terrains interact — written by AI ({costLabel}).
            </p>
          )}
        </div>
        {!reading && !noCredits && (
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
            style={{
              whiteSpace: 'nowrap', fontSize: '0.9rem', opacity: loading ? 0.6 : 1,
              background: 'transparent', color: 'var(--color-accent)',
              border: '1.5px solid var(--color-accent)',
            }}
          >
            {loading ? 'Generating…' : 'Generate Pair Reading'}
          </button>
        )}
      </div>

      {noCredits && (
        <div style={{
          marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px',
          background: 'rgba(249,112,102,0.08)', border: '1px solid rgba(249,112,102,0.2)',
          fontSize: '0.85rem', color: 'var(--color-text-muted)',
        }}>
          No reading credits remaining.{' '}
          <button onClick={onGetCredits || onOpenSettings} style={{ color: 'var(--color-accent)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Get more on your account page
          </button>
        </div>
      )}

      {error && (
        <p role="alert" style={{
          color: '#f97066', fontSize: '0.8rem', marginTop: '0.75rem',
          padding: '0.5rem', background: 'rgba(249,112,102,0.08)', borderRadius: '6px',
        }}>
          {error}
        </p>
      )}

      {reading && (
        <div style={{ marginTop: '0.85rem' }}>
          <ReadingRenderer text={reading} />
          <button
            className="btn-secondary"
            onClick={handleGenerate}
            disabled={loading}
            style={{ fontSize: '0.75rem', marginTop: '0.75rem' }}
          >
            {loading ? 'Regenerating…' : `Regenerate${managed ? ' (1 credit)' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
