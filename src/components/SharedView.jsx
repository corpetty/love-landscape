import React, { useEffect } from 'react';
import VisualizationTabs from './VisualizationTabs.jsx';
import ArchetypeCard from './ArchetypeCard.jsx';
import LandscapeReading from './LandscapeReading.jsx';
import CodeDisplay from './CodeDisplay.jsx';
import { computeArchetype } from '../data/archetypes.js';
import { record, setPendingSource, setPendingPartner } from '../data/journey.js';

/**
 * Read-only view of a landscape someone shared at /r/<slug> (spec AD-1).
 * Deliberately never touches the visitor's own saved result: owner state,
 * localStorage persistence, and URL rewriting all stay untouched.
 */
export default function SharedView({ params, code, onTakeAssessment, onScience }) {
  useEffect(() => {
    const arch = computeArchetype(params);
    record('share_page_view', arch ? { archetype: arch.archetype.key } : {});
  }, [params]);

  function handleCta() {
    record('share_page_cta');
    // Leave /r/<slug> before entering the assessment: otherwise the results
    // screen's URL effect would append the visitor's code to the sharer's
    // path, and a mid-assessment refresh would re-serve the share page.
    try { window.history.replaceState({}, '', '/'); } catch { /* ignore */ }
    setPendingSource('share');
    // Remember whose landscape this is, so the visitor's results auto-compare
    // back against it — closing the share → take → compare loop.
    if (code) setPendingPartner(code);
    onTakeAssessment();
  }

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', textAlign: 'center' }}>
        A Shared Landscape
      </h2>
      <p style={{
        textAlign: 'center', color: 'var(--color-text-muted)',
        fontSize: '0.9rem', marginBottom: '1.25rem',
      }}>
        Someone shared the shape of their relational world with you.
      </p>

      <VisualizationTabs params={params} partnerParams={null} view="yours" />

      <ArchetypeCard params={params} style={{ marginTop: '1.5rem' }} />

      <div style={{ marginTop: '1.5rem' }}>
        <LandscapeReading params={params} onScience={onScience} />
      </div>

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.25rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.95rem', marginBottom: '0.9rem' }}>
          What does <em>your</em> landscape look like?
        </p>
        <button className="btn-primary" onClick={handleCta}>
          Take the assessment — see your own shape
        </button>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
          19 questions, about five minutes, free. Afterwards you can compare
          your landscape with this one using its code below.
        </p>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <CodeDisplay code={code} />
      </div>
    </div>
  );
}
