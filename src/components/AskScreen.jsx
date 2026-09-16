import React, { useState, useEffect } from 'react';
import ContourView from './ContourView.jsx';
import PlacementPicker from './PlacementPicker.jsx';
import ReadingRenderer from './ReadingRenderer.jsx';
import { decodeParams } from '../data/encoding.js';
import { findPath } from '../terrain/pathfinder.js';
import { buildPathNarrative, narrativeToMarkdown } from '../data/pathNarrative.js';
import { answerAsk, withdrawAnswer, hasAnswered } from '../data/asksClient.js';
import { record, setPendingSource, setPendingPartner } from '../data/journey.js';
import { DISCLAIMER } from '../data/recommendations.js';

/**
 * /ask/<slug> — someone opened their landscape and asked one question.
 *
 * Deliberately answerable by a stranger: no account, no assessment, one screen.
 * Requiring the assessment first would put a nineteen-question wall in front of
 * a question a person can answer in thirty seconds, and the assessment is the
 * thing we want them to *choose* afterwards, not the toll for participating.
 *
 * The sealed order is the spine of the screen. Before answering, the visitor
 * sees the landscape and the question and nothing else — the server does not
 * send the sender's pin, so there is nothing to anchor to even for someone
 * reading the network tab. Answering returns the reveal, which is also the
 * payoff and the natural moment to offer the assessment.
 */
export default function AskScreen({ slug, code, alreadyAnswered, onTakeAssessment }) {
  const params = decodeParams(code);
  const [point, setPoint] = useState({ x: 0.5, y: 0.5, exclusivity: null, note: '' });
  const [phase, setPhase] = useState('answering'); // answering | sending | revealed | error
  const [reveal, setReveal] = useState(null);
  const [error, setError] = useState('');
  const [revising, setRevising] = useState(false);

  useEffect(() => {
    record('ask_open', { revisit: hasAnswered(slug) || undefined });
  }, [slug]);

  if (!params) {
    return (
      <div style={{ paddingTop: '3rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>This question is closed</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>The link is no longer active.</p>
      </div>
    );
  }

  async function send() {
    setPhase('sending');
    setError('');
    try {
      const out = await answerAsk(slug, {
        x: point.x,
        y: point.y,
        exclusivity: point.exclusivity ?? null,
        note: point.note || null,
      });
      record('ask_answer', { revised: out.revised || undefined });
      setReveal(out);
      setPhase('revealed');
      setRevising(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e.status === 409
        ? 'Someone else has already answered this question. Ask them to send you your own link.'
        : e.status === 410
          ? 'This link is no longer active — the person who sent it has taken it back.'
          : e.message);
      setPhase('error');
    }
  }

  async function takeItBack() {
    try {
      await withdrawAnswer(slug);
      setReveal(null);
      setPhase('answering');
      setRevising(false);
    } catch (e) {
      setError(e.message);
    }
  }

  function startAssessment() {
    record('share_page_cta', { from: 'ask' });
    try { window.history.replaceState({}, '', '/'); } catch { /* ignore */ }
    setPendingSource('ask');
    // Carry the sender's landscape so the visitor's own results open straight
    // into the comparison — the same round-trip a share page closes.
    if (code) setPendingPartner(code);
    onTakeAssessment();
  }

  // The reveal: the sender's pin, the route between, and the reading. Computed
  // on the sender's terrain, because these are the sender's ridges.
  const path = reveal?.owner_point
    ? findPath(params, reveal.owner_point, point, { exclusivity: point.exclusivity ?? null })
    : null;
  const narrative = path && buildPathNarrative(path, {
    perspective: 'partner',
    otherName: null,
    note: point.note || null,
  });

  if (phase === 'revealed' && path) {
    return (
      <div style={{ paddingTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', textAlign: 'center' }}>
          The journey between you
        </h2>
        <p style={{
          textAlign: 'center', color: 'var(--color-text-muted)',
          fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6,
        }}>
          Your answer is saved. This is where they said the bond stands today, where you said you
          want it to be, and the ground between — on their landscape.
        </p>

        <ContourView
          params={params}
          route={path.polyline}
          markers={[
            { key: 'now', x: path.start.x, y: path.start.y, label: 'Now', tone: 'placement' },
            { key: 'wanted', x: path.end.x, y: path.end.y, label: 'You', tone: 'desire' },
          ]}
          showFeatureLabels={false}
        />

        <div style={{ marginTop: '1.25rem' }}>
          <ReadingRenderer text={narrativeToMarkdown(narrative)} />
        </div>

        <div className="card" style={{ marginTop: '1.5rem', padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', marginBottom: '0.9rem' }}>
            That was their landscape. What does <em>yours</em> look like?
          </p>
          <button className="btn-primary" onClick={startAssessment}>
            Take the assessment — see your own shape
          </button>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
            Nineteen questions, a few minutes, no account needed.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => { setRevising(true); setPhase('answering'); }} style={{ fontSize: '0.82rem' }}>
            Change my answer
          </button>
          <button className="btn-secondary" onClick={takeItBack} style={{ fontSize: '0.82rem' }}>
            Take my answer back
          </button>
        </div>
        {error && <p role="alert" style={{ color: '#f97066', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.6rem' }}>{error}</p>}

        <p style={{
          fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic',
          marginTop: '1.5rem', textAlign: 'center', lineHeight: 1.6,
        }}>
          {DISCLAIMER}
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem', textAlign: 'center' }}>
        A question about where this is going
      </h2>
      <p style={{
        textAlign: 'center', color: 'var(--color-text-muted)',
        fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6,
      }}>
        Someone mapped the shape of their relational world, and marked where one bond with you
        stands on it today. They would like to know where <em>you</em> want it to be.
        {' '}You will see their answer once you have given yours.
      </p>

      {(alreadyAnswered && !revising) && (
        <p style={{
          textAlign: 'center', fontSize: '0.84rem', color: 'var(--color-text-muted)',
          marginBottom: '1rem',
        }}>
          This question has already been answered. If that was you, answering again will revise it.
        </p>
      )}

      <PlacementPicker
        params={params}
        value={point}
        onChange={setPoint}
        onDone={send}
        tone="desire"
        title="Where do you want this bond to be?"
        prompt="This is their terrain, not yours. Mark the place you want this bond to sit on it — there is no right answer, and nothing here is published."
        pinLabel="You"
        showExclusivity
        showNote
        doneLabel={phase === 'sending' ? 'Sending…' : revising ? 'Save my new answer' : 'Send my answer'}
      />

      {error && (
        <p role="alert" style={{ color: '#f97066', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.75rem' }}>
          {error}
        </p>
      )}

      <p style={{
        fontSize: '0.8rem', color: 'var(--color-text-muted)',
        marginTop: '1.25rem', textAlign: 'center', lineHeight: 1.6,
      }}>
        No account needed. Your answer goes to the person who sent this link, and nowhere else.
      </p>
    </div>
  );
}
