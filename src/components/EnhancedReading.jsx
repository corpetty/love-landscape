import React, { useState, useEffect } from 'react';
import {
  getEffectiveConfig, chatCompletion, getCachedCredits, refreshCredits,
} from '../data/llmClient.js';
import { buildReadingPrompt } from '../data/llmPrompt.js';
import ReadingRenderer from './ReadingRenderer.jsx';
import { getSavedReading, saveReading } from '../data/resultsClient.js';

/**
 * The credit-based AI Reading tier of the Readings section. Generated text
 * persists per landscape code (ll-readings-v1), so a refresh shows a done
 * state instead of a fresh generate button. The credit cost and balance are
 * visible before clicking, not discovered via a 402 after.
 *
 * @param {Object}   props
 * @param {number[]} props.params
 * @param {string}   props.code            - Landscape code the reading belongs to (persistence key)
 * @param {Object}   props.contextAnswers
 * @param {boolean}  props.deemphasized    - Full Reading is owned: don't upsell this tier
 * @param {Function} props.onOpenSettings
 * @param {Function} props.onGetCredits
 * @param {Function} [props.onReadingGenerated] - Called with (readingText) when produced or restored
 */
export default function EnhancedReading({ params, code, contextAnswers, deemphasized, onOpenSettings, onGetCredits, onReadingGenerated }) {
  const [reading, setReading]     = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [noCredits, setNoCredits] = useState(false);
  const [credits, setCredits]     = useState(getCachedCredits());
  const managed = getEffectiveConfig().provider === 'managed';

  // Restore the saved reading whenever the landscape on screen changes.
  useEffect(() => {
    const saved = code ? getSavedReading(code, 'solo') : null;
    setReading(saved?.text || '');
    setGeneratedAt(saved?.created_at || null);
    setError(null);
    if (saved?.text) onReadingGenerated?.(saved.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (managed) {
      refreshCredits().then((d) => { if (d) setCredits(d.creditsRemaining); });
    }
  }, [managed]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setNoCredits(false);

    try {
      const config = getEffectiveConfig();
      const { systemMessage, userMessage } = buildReadingPrompt(params, contextAnswers);
      const result = await chatCompletion(config, systemMessage, userMessage, 'read');
      setReading(result);
      setGeneratedAt(Date.now());
      if (code) saveReading({ code, kind: 'solo', text: result });
      onReadingGenerated?.(result);
    } catch (err) {
      if (err.code === 'NO_CREDITS') {
        setNoCredits(true);
      } else {
        setError(err.message);
      }
    } finally {
      setCredits(getCachedCredits());
      setLoading(false);
    }
  }

  // Full Reading owned and this tier was never used — nothing to upsell.
  if (deemphasized && !reading && !loading) return null;

  const costLabel = managed
    ? `1 credit${credits !== null ? ` · ${credits} left` : ''}`
    : 'uses your configured AI provider';

  return (
    <div className="card" style={{ marginTop: '0.75rem', padding: '1.1rem 1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h4 style={{ fontSize: '1rem' }}>AI Reading</h4>
            {reading && (
              <span style={{ fontSize: '0.75rem', color: '#2dd4a8', fontWeight: 600 }}>
                ✓ Generated{generatedAt ? ` ${new Date(generatedAt).toLocaleDateString()}` : ''}
              </span>
            )}
          </div>
          {!reading && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginTop: '0.2rem' }}>
              A personalized interpretation of your terrain, written by AI ({costLabel}).
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
            {loading ? 'Generating…' : 'Generate AI Reading'}
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

      {!reading && (
        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.6rem', opacity: 0.6 }}>
          Powered by Love Landscape AI ·{' '}
          <button onClick={onOpenSettings} style={{ color: 'var(--color-accent)', textDecoration: 'underline', textUnderlineOffset: '2px', fontSize: '0.7rem' }}>
            settings
          </button>
        </p>
      )}
    </div>
  );
}
