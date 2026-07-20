import React, { useState, useCallback } from 'react';
import ArchetypeCard from './ArchetypeCard.jsx';
import LandscapeReading from './LandscapeReading.jsx';
import EnhancedReading from './EnhancedReading.jsx';
import FullReadingCard from './FullReadingCard.jsx';
import { ARTICLE_URL } from '../data/articleContent.js';

/**
 * The one place readings live, as a clear ladder:
 *   1. built-in interpretation — included, always shown
 *   2. AI Reading — 1 credit, persisted per code, shows a done state
 *   3. Full Reading — $12 one-time, device-owned results only
 * When the Full Reading is owned, the AI Reading tier stops upselling itself.
 */
export default function ReadingsSection({
  params, code, contextAnswers, ownedEntry, fullReadingPartnerCode,
  onOpenSettings, onGetCredits, onReadingGenerated,
}) {
  const [fullReadingOwned, setFullReadingOwned] = useState(false);
  const handleEntitled = useCallback(() => setFullReadingOwned(true), []);

  return (
    <section style={{ marginTop: '2rem' }}>
      <ArchetypeCard params={params} style={{ marginBottom: '1.5rem' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1.1rem' }}>Your Reading</h3>
        <a
          href={ARTICLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
            opacity: 0.7,
          }}
        >
          Read the article
        </a>
      </div>

      <LandscapeReading params={params} hideTitle />

      <EnhancedReading
        params={params}
        code={code}
        contextAnswers={contextAnswers}
        deemphasized={fullReadingOwned}
        onOpenSettings={onOpenSettings}
        onGetCredits={onGetCredits}
        onReadingGenerated={onReadingGenerated}
      />

      {ownedEntry && (
        <FullReadingCard
          clientResultId={ownedEntry.client_result_id}
          partnerCode={fullReadingPartnerCode}
          onEntitled={handleEntitled}
        />
      )}
    </section>
  );
}
