import React, { useState, useEffect, useRef } from 'react';
import VisualizationTabs from './VisualizationTabs.jsx';
import CodeDisplay from './CodeDisplay.jsx';
import RecommendationCards from './RecommendationCards.jsx';
import ResearchContribution from './ResearchContribution.jsx';
import ReadingsSection from './ReadingsSection.jsx';
import CompatibilityReportCard from './CompatibilityReportCard.jsx';
import PairCompatibility from './PairCompatibility.jsx';
import { decodeParams, encodeParams } from '../data/encoding.js';
import { generateRecommendations } from '../data/recommendations.js';
import { addRecentComparison, getRecentComparisons, comparisonDisplayName } from '../data/comparisons.js';
import { computeArchetype } from '../data/archetypes.js';
import { consumePendingPartner, record } from '../data/journey.js';
import AuthPanel from './AuthPanel.jsx';
import SharePageCard from './SharePageCard.jsx';
import { useAuth, authAvailable, completeSignup } from '../data/auth.js';
import { getOwnedResultByCode } from '../data/resultsClient.js';

export default function ResultsScreen({ params, baseParams, code, contextAnswers, refineError, onReset, onAbout, onOpenSettings, onOpenAccount, onScience, initialPartnerCode }) {
  const wasRefined = baseParams && params !== baseParams &&
    baseParams.some((v, i) => Math.abs(v - params[i]) > 0.001);
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerParams, setPartnerParams] = useState(null);
  const [partnerError, setPartnerError] = useState('');
  const [view, setView] = useState('yours');
  const [confirmReset, setConfirmReset] = useState(false);
  // AI reading text — lifted so ResearchContribution can offer to include it
  const [aiReading, setAiReading] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  // savedTick forces a re-render so getOwnedResultByCode re-reads the store after auth.
  const [, setSavedTick] = useState(0);
  const { user } = useAuth();
  // This device's ownership entry for the code on screen (null for loaded partner codes).
  const ownedEntry = getOwnedResultByCode(code);
  const isSaved = Boolean(ownedEntry?.claimed);

  // Signed-in user finishing a NEW assessment: link it without re-prompting.
  React.useEffect(() => {
    if (user && ownedEntry && !ownedEntry.claimed) {
      completeSignup(ownedEntry).then(() => setSavedTick((t) => t + 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ownedEntry?.client_result_id, ownedEntry?.claimed]);

  const compatRef = useRef(null);

  function loadPartner(codeArg) {
    const raw = typeof codeArg === 'string' ? codeArg : partnerCode;
    const p = decodeParams(raw);
    if (!p) {
      setPartnerError('Invalid code. Codes start with L1_ or L2_ followed by encoded characters.');
      return;
    }
    const canonical = encodeParams(p);
    setPartnerCode(canonical);
    setPartnerParams(p);
    setPartnerError('');
    addRecentComparison(canonical);
    record('content_page_view', { page: 'compare', archetype: computeArchetype(p)?.archetype?.key });
    // Surface the freshly-loaded compatibility content.
    setTimeout(() => compatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }

  // Auto-load a partner from the share round-trip (SharedView stashes the sharer's
  // code) or a ?compare= deep link, so the comparison appears without a manual paste.
  useEffect(() => {
    const pc = initialPartnerCode || consumePendingPartner();
    if (pc) loadPartner(pc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentComparisons = getRecentComparisons().filter((c) => c.code !== code);

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

  // Canonical form of the loaded partner code — the persistence key for
  // readings must not vary with how the code was typed.
  const canonicalPartnerCode = partnerParams ? encodeParams(partnerParams) : null;
  const viewingTheirs = view === 'theirs' && partnerParams;

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

      {/* Compatibility headline — the archetype pairing + free snapshot (the hook) */}
      <div ref={compatRef} style={{ scrollMarginTop: '1rem' }} />
      {partnerParams && (
        <PairCompatibility
          params={params}
          partnerParams={partnerParams}
          code={code}
          partnerCode={canonicalPartnerCode}
        />
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

      {/* Readings — built-in, AI (credit), and Full ($12) in one ladder */}
      <ReadingsSection
        params={viewingTheirs ? partnerParams : params}
        code={viewingTheirs ? canonicalPartnerCode : code}
        contextAnswers={contextAnswers}
        ownedEntry={ownedEntry}
        fullReadingPartnerCode={partnerParams ? partnerCode : null}
        onOpenSettings={onOpenSettings}
        onGetCredits={onOpenAccount}
        onReadingGenerated={setAiReading}
        onScience={onScience}
      />

      {/* Save & Share — code, account save, and the public page in one place */}
      <section style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Save &amp; Share</h3>
        <CodeDisplay code={code} onShareLink={handleShareLink} />

        {/* Save to account — only for results created on this device */}
        {authAvailable && ownedEntry && (
          <div className="card" style={{
            marginTop: '1rem', padding: '1rem 1.25rem', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
          }}>
            {isSaved ? (
              <p style={{ fontSize: '0.9rem', color: '#2dd4a8' }}>
                ✓ Saved to your account
              </p>
            ) : (
              <>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', flex: '1 1 220px' }}>
                  Landscapes live only in this browser right now. A free account keeps them —
                  across devices, and safe from cleared history.
                </p>
                <button className="btn-primary" onClick={() => setShowAuth(true)} style={{ whiteSpace: 'nowrap' }}>
                  Save my landscape
                </button>
              </>
            )}
          </div>
        )}

        {/* Public share page — device-owned results only */}
        {ownedEntry && <SharePageCard clientResultId={ownedEntry.client_result_id} />}
      </section>

      {showAuth && (
        <AuthPanel
          currentEntry={ownedEntry}
          onClose={() => { setShowAuth(false); setSavedTick((t) => t + 1); }}
          onSignedIn={() => setSavedTick((t) => t + 1)}
        />
      )}

      {/* Partner import */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Compare Landscapes</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          Share your code with a partner. When they take the assessment, paste their code here to
          see how your landscapes overlap.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={partnerCode}
            onChange={(e) => { setPartnerCode(e.target.value); setPartnerError(''); }}
            placeholder="Partner's code (L1_... or L2_...)"
            aria-label="Partner's landscape code"
            style={{
              flex: '1 1 200px',
              minWidth: 0,
              padding: '0.6rem 0.85rem',
              borderRadius: '6px',
              border: `1px solid ${partnerError ? '#f97066' : 'var(--color-border)'}`,
              background: 'var(--color-bg-card)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.95rem',
            }}
          />
          <button className="btn-primary" onClick={() => loadPartner()} style={{ padding: '0.6rem 1.25rem' }}>
            Compare
          </button>
        </div>
        {partnerError && (
          <p role="alert" style={{ color: '#f97066', fontSize: '0.85rem', marginTop: '0.25rem' }}>{partnerError}</p>
        )}
        {recentComparisons.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.6rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Recent:</span>
            {recentComparisons.map((c) => (
              <button
                key={c.code}
                onClick={() => loadPartner(c.code)}
                className="btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
              >
                {comparisonDisplayName(c)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <RecommendationCards recommendations={recommendations} />

      {/* Paid Compatibility Report — the deep pair reading (dormant until infra).
          Only for device-owned results; the free hook above stands on its own. */}
      {partnerParams && ownedEntry && (
        <CompatibilityReportCard
          clientResultId={ownedEntry.client_result_id}
          partnerCode={canonicalPartnerCode}
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
