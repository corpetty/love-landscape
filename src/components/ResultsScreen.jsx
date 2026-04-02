import React, { useState } from 'react';
import VisualizationTabs from './VisualizationTabs.jsx';
import CodeDisplay from './CodeDisplay.jsx';
import RecommendationCards from './RecommendationCards.jsx';
import LandscapeReading from './LandscapeReading.jsx';
import ResearchContribution from './ResearchContribution.jsx';
import EnhancedReading from './EnhancedReading.jsx';
import PairReading from './PairReading.jsx';
import { decodeParams } from '../data/encoding.js';
import { generateRecommendations } from '../data/recommendations.js';

export default function ResultsScreen({ params, baseParams, code, contextAnswers, refineError, onReset, onAbout, onOpenSettings }) {
  const wasRefined = baseParams && params !== baseParams &&
    baseParams.some((v, i) => Math.abs(v - params[i]) > 0.001);
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerParams, setPartnerParams] = useState(null);
  const [partnerError, setPartnerError] = useState('');
  const [view, setView] = useState('yours');
  const [confirmReset, setConfirmReset] = useState(false);
  // AI reading text — lifted so ResearchContribution can offer to include it
  const [aiReading, setAiReading] = useState('');

  function loadPartner() {
    const p = decodeParams(partnerCode);
    if (!p) {
      setPartnerError('Invalid code. Codes start with L1_ or L2_ followed by encoded characters.');
      return;
    }
    setPartnerParams(p);
    setPartnerError('');
  }

  function handleShareLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('code', code);
    navigator.clipboard.writeText(url.toString()).catch(() => {});
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    onReset();
  }

  const recommendations = partnerParams
    ? generateRecommendations(params, partnerParams)
    : null;

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>
        Your Landscape
      </h2>

      {/* Refinement indicator */}
      {wasRefined && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#2dd4a8',
          marginBottom: '0.75rem',
        }}>
          ✓ Parameters refined by AI based on your context
        </p>
      )}
      {refineError && (
        <p style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#f97066',
          marginBottom: '0.75rem',
        }}>
          AI refinement failed — showing base values. ({refineError})
        </p>
      )}

      {/* View toggle */}
      {partnerParams && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.25rem',
          marginBottom: '1rem',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '4px',
          width: 'fit-content',
          margin: '0 auto 1rem',
        }}>
          {['yours', 'theirs', 'combined'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: view === v ? 600 : 400,
                background: view === v ? 'var(--color-accent)' : 'transparent',
                color: view === v ? '#fff' : 'var(--color-text-muted)',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      <VisualizationTabs
        params={params}
        partnerParams={partnerParams}
        view={view}
      />

      {/* Code + Share */}
      <div style={{ marginTop: '1.5rem' }}>
        <CodeDisplay code={code} onShareLink={handleShareLink} />
      </div>

      {/* Landscape reading */}
      <LandscapeReading params={view === 'theirs' && partnerParams ? partnerParams : params} />

      {/* AI-enhanced reading */}
      <EnhancedReading
        params={view === 'theirs' && partnerParams ? partnerParams : params}
        contextAnswers={contextAnswers}
        onOpenSettings={onOpenSettings}
        onReadingGenerated={setAiReading}
      />

      {/* Partner import */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Compare Landscapes</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          Share your code with a partner. When they take the assessment, paste their code here to
          see how your landscapes overlap.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={partnerCode}
            onChange={(e) => { setPartnerCode(e.target.value); setPartnerError(''); }}
            placeholder="Partner's code (L1_... or L2_...)"
            aria-label="Partner's landscape code"
            style={{
              flex: 1,
              padding: '0.6rem 0.85rem',
              borderRadius: '6px',
              border: `1px solid ${partnerError ? '#f97066' : 'var(--color-border)'}`,
              background: 'var(--color-bg-card)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.95rem',
            }}
          />
          <button className="btn-primary" onClick={loadPartner} style={{ padding: '0.6rem 1.25rem' }}>
            Compare
          </button>
        </div>
        {partnerError && (
          <p role="alert" style={{ color: '#f97066', fontSize: '0.85rem', marginTop: '0.25rem' }}>{partnerError}</p>
        )}
      </div>

      {/* Recommendations */}
      <RecommendationCards recommendations={recommendations} />

      {/* AI pair reading — only shown when comparing */}
      {partnerParams && (
        <PairReading
          params={params}
          partnerParams={partnerParams}
          onOpenSettings={onOpenSettings}
          onReadingGenerated={(text) => setAiReading((prev) => prev ? `${prev}\n\n---\n\n${text}` : text)}
        />
      )}

      {/* Research contribution */}
      <ResearchContribution params={params} aiReading={aiReading} />

      {/* Reset */}
      <div style={{ textAlign: 'center', marginTop: '2.5rem', paddingBottom: '1rem' }}>
        {confirmReset ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.25rem',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              This will clear your saved result.
            </span>
            <button className="btn-primary" onClick={handleReset} style={{
              padding: '0.4rem 1rem',
              fontSize: '0.85rem',
              background: '#f97066',
            }}>
              Confirm
            </button>
            <button className="btn-secondary" onClick={() => setConfirmReset(false)} style={{
              padding: '0.4rem 1rem',
              fontSize: '0.85rem',
            }}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={handleReset}>
            Start over
          </button>
        )}
      </div>
    </div>
  );
}
