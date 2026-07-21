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
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>The Science (and its limits)</h2>
          <div style={{ color: 'var(--color-text-muted)' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>What this is:</strong> a structured reflection tool. It turns how you
              answer 19 questions into a landscape you can look at, talk about, and share.
              It is <em>not</em> a clinical, diagnostic, or validated psychometric instrument,
              and it isn't fortune-telling — it's a mirror built from a coherent theory.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>What it's grounded in:</strong> most of the dimensions map onto
              constructs psychologists actually study — attachment security draws on the
              anxiety/avoidance model behind the ECR-R; the need for structure and comfort
              with ambiguity relate to the Need for Closure literature; playfulness to the
              OLIW model of adult play; touch comfort to research on affectionate
              communication; openness to work on sociosexuality and consensual non-monogamy.
              The <em>tender middle</em> — the space between friendship and romance — is the
              one dimension with little prior research; that part is our own contribution, not
              borrowed authority.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Why terrain types, not fixed categories:</strong> your terrain is
              continuous — thirteen sliders, not thirteen switches. An archetype is just the
              nearest recognizable <em>region</em> of that space, the way attachment
              "styles" are named regions of a continuum. If you sit between two, we'll say so.
              Retake it in a different mood and you may land next door; that's the terrain
              shifting, not a broken test.
            </p>
            <p>
              <strong>The honest limits:</strong> each dimension rests on only a question or
              two, so it can't claim measurement-grade precision; the formula weights are
              informed estimates, not validated coefficients; and descriptions are written to
              be specific enough to be <em>wrong</em> for some people rather than flatter
              everyone. We're working to improve this — anyone who opts into research
              contributes an anonymous terrain that lets us check how the dimensions hold up
              and refine the archetypes over time.
            </p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Who made this (and why)</h2>
          <div style={{ color: 'var(--color-text-muted)' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              I'm Corey — I built Love Landscape. It grew out of an essay I wrote,{' '}
              <a
                href="https://bayesianpersuasion.com/posts/the-shape-of-intimacy"
                target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--color-accent)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
              >The Shape of Intimacy</a>, because I wanted the picture it describes to actually
              exist — something you could take, look at, and talk through with someone.
            </p>
            <p>
              To be plain about what this isn't: it's not an engagement farm or a data-harvesting
              funnel. There's no signup wall, no email required to see your result, and nothing is
              sold to third parties (see Privacy below). I'd rather it be honest and a little rough
              than slick and manipulative — and I'm improving it in the open as people use it.
            </p>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Privacy</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Your questionnaire answers never leave your device — the terrain is computed and
            rendered locally. Your landscape code encodes your 13 parameters into a short string;
            it's stored (without your answers) so features like saving and sharing work, along with
            anonymous usage counts (completions, shares) that help us improve the app. Accounts are
            optional and email-only. AI readings send your parameters to the language model you
            choose in Settings. Research contribution remains a separate, explicit opt-in. No data
            is ever sold or shared with third parties.
          </p>
        </section>
      </div>
    </div>
  );
}
