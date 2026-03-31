import React from 'react';

export default function AboutSection({ onBack }) {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '2rem' }}>
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
        Back
      </button>

      <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>How It Works</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: 1.75 }}>
        <section>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>The Landscape</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Your landscape is a potential energy surface — a 3D terrain that represents how you
            relate to different forms of intimacy. The two axes map <em>expression</em> (emotional
            to physical) against <em>depth</em> (shallow to deep).
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Reading the Terrain</h2>
          <div style={{ color: 'var(--color-text-muted)' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong style={{ color: '#2dd4a8' }}>Valleys</strong> are places where
              relationships naturally settle. Low energy means effortless, comfortable, open.
              These are your relational home base.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong style={{ color: '#f97066' }}>Ridges</strong> are energy barriers —
              resistance, discomfort, or boundaries. They're not walls, just terrain that
              takes more effort to cross.
            </p>
            <p>
              <strong style={{ color: 'var(--color-text-muted)' }}>Flat edges</strong> are
              unexplored territory. Not closed off, just unmapped. Everyone has frontiers.
            </p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Key Features</h2>
          <div style={{ color: 'var(--color-text-muted)' }}>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Deep friendships</strong> — emotional depth in platonic bonds
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Romantic love</strong> — the classic deep emotional-physical valley
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Tender middle</strong> — the ambiguous space between friendship and romance.
              For some this is a comfortable valley; for others, an uncomfortable ridge
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Casual touch</strong> — comfort with light physical connection
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Empty physicality</strong> — barrier against physical intimacy without emotional grounding
            </p>
            <p>
              <strong>Ungrounded intensity</strong> — barrier against intense connection without structure
            </p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Comparing Landscapes</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            When you and a partner both take the assessment, you can compare landscapes. The
            combined view averages your terrains — showing where you share common ground and where
            the terrain differs. Differences aren't problems; they're starting points for
            conversation.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Privacy</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Everything happens on your device. No data is sent to any server. Your landscape code
            encodes your 13 parameters into a short string — share it however you like. No accounts,
            no tracking, no analytics.
          </p>
        </section>
      </div>
    </div>
  );
}
