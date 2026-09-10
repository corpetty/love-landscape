import React, { useState, useEffect, useMemo } from 'react';
import ContourView from './ContourView.jsx';
import PlacementPicker from './PlacementPicker.jsx';
import ReadingRenderer from './ReadingRenderer.jsx';
import { findPath } from '../terrain/pathfinder.js';
import { buildPathNarrative, narrativeToMarkdown, symmetryLine } from '../data/pathNarrative.js';
import { encodeView, decodeView } from '../data/encoding.js';
import { getJourney, saveJourney } from '../data/journeys.js';
import { DISCLAIMER } from '../data/recommendations.js';
import { record } from '../data/journey.js';

/**
 * The Growth Journey — where a bond stands on someone's landscape, where it
 * wants to be, and the route between.
 *
 * Phase A is deliberately code-only (no server, no account, matching how
 * landscape codes already work): each person marks their point and sends back a
 * `V2_` code. The ask link comes in Phase B.
 *
 * Three design rules are load-bearing and should not be relaxed casually:
 *
 * 1. **Routes are computed on one person's terrain at a time.** The ridges on a
 *    route are that person's own needs. Averaging the two landscapes would hide
 *    whose barrier it is, which is the one fact the reading exists to say. So
 *    the feature is two mirror-image directions, never one merged view.
 * 2. **Sealed reveal.** The other person's answer is not read until yours
 *    exists. Seeing it first turns an honest question into an anchoring one,
 *    and this is a feature that can hurt, so it takes the safer default.
 * 3. **A pasted point must match the terrain it was marked on.** A view code
 *    carries its landscape precisely so a point can be refused rather than
 *    silently drawn on the wrong map, where it would mean something else.
 */
export default function GrowthJourneyCard({ params, code, partnerParams, partnerCode, partnerName }) {
  const [state, setState] = useState(() => getJourney(code, partnerCode) || {});
  const [copied, setCopied] = useState('');

  // Reload whenever the pairing changes: without this the previous
  // comparison's pins would linger on a landscape they do not belong to.
  useEffect(() => {
    setState(getJourney(code, partnerCode) || {});
    setCopied('');
  }, [code, partnerCode]);

  function put(patch) {
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveJourney(code, partnerCode, next);
      return next;
    });
  }

  function copy(text, which) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(''), 2000);
    }).catch(() => {});
  }

  // Direction A runs on your terrain: you say where the bond stands, they say
  // where it wants to be. Direction B is the same thing mirrored.
  const pathA = useMemo(() => (
    state.placement && state.theirDesire
      ? findPath(params, state.placement, state.theirDesire, { exclusivity: state.theirDesire.exclusivity })
      : null
  ), [params, state.placement, state.theirDesire]);

  const pathB = useMemo(() => (
    partnerParams && state.theirPlacement && state.myDesire
      ? findPath(partnerParams, state.theirPlacement, state.myDesire, { exclusivity: state.myDesire.exclusivity })
      : null
  ), [partnerParams, state.theirPlacement, state.myDesire]);

  const symmetry = pathA && pathB ? symmetryLine(pathA, pathB) : null;

  return (
    <section style={{ marginTop: '2rem' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Growth Journey</h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '1.25rem' }}>
        A comparison shows two shapes side by side. This asks something narrower: where does one
        particular bond sit on a landscape, where does it want to be, and what stands between.
        Nothing here is shared or published — it stays on this device unless you copy a code.
      </p>

      <JourneyDirection
        heading="On your landscape"
        terrain={params}
        terrainCode={code}
        /* You place the bond; they say where it wants to be. */
        myKind="placement"
        mine={state.placement}
        setMine={(v) => put({ placement: v })}
        theirs={state.theirDesire}
        setTheirs={(v) => put({ theirDesire: v })}
        path={pathA}
        perspective="owner"
        partnerName={partnerName}
        onCopy={copy}
        copied={copied}
        copyKey="a"
      />

      {partnerParams && (
        <JourneyDirection
          heading="On their landscape"
          terrain={partnerParams}
          terrainCode={partnerCode}
          /* Mirrored: you say where you want to be, they place the bond. */
          myKind="desire"
          mine={state.myDesire}
          setMine={(v) => put({ myDesire: v })}
          theirs={state.theirPlacement}
          setTheirs={(v) => put({ theirPlacement: v })}
          path={pathB}
          perspective="partner"
          partnerName={partnerName}
          onCopy={copy}
          copied={copied}
          copyKey="b"
          style={{ marginTop: '1.75rem' }}
        />
      )}

      {symmetry && (
        <div className="card" style={{ marginTop: '1.25rem', padding: '1rem 1.15rem' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>The two of you together</h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>{symmetry}</p>
        </div>
      )}

      <p style={{
        fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic',
        marginTop: '1.25rem', textAlign: 'center', lineHeight: 1.6,
      }}>
        A pin is one person&apos;s reading of a relationship on one day. {DISCLAIMER}
      </p>
    </section>
  );
}

/** Copy for the two halves of a direction, so the mirror stays symmetric. */
const ROLE = {
  placement: {
    // Subject position, so it needs the subject pronoun and matching verb:
    // "Where do they stand" / "Where does Sam stand", never "does them".
    title: ({ subject, isNamed }) => `Where ${isNamed ? 'does' : 'do'} ${subject} stand today?`,
    prompt: 'Not where you wish it were — where the bond actually sits right now, on this terrain.',
    pin: (name) => name || 'Them',
    done: 'Save this placement',
    placed: 'You marked where this bond stands today.',
    askTitle: (other) => `Ask ${other} where it wants to be`,
    askBody: 'They load this landscape, mark where they want the bond to be, and send back a code.',
    theirLabel: 'Their answer (V2_…)',
    theirDone: 'marked where this bond wants to be',
    wrongKind: 'That code marks where a bond stands, not where it wants to be.',
    extras: false,
  },
  desire: {
    title: ({ possessive }) => `Where do you want to be on ${possessive} landscape?`,
    prompt: 'This is their terrain, not yours. Mark the place you want this bond to sit on it.',
    pin: () => 'You',
    done: 'Save and get my code',
    placed: 'You marked where you want this bond to be.',
    askTitle: (other) => `Ask ${other} where it stands today`,
    askBody: 'They mark where the bond actually sits on their own terrain, and send back a code.',
    theirLabel: 'Their answer (V2_…)',
    theirDone: 'marked where this bond stands today',
    wrongKind: 'That code marks where a bond wants to be, not where it stands.',
    extras: true,
  },
};

const OPPOSITE = { placement: 'desire', desire: 'placement' };
const PIN_LABEL = { placement: 'Now', desire: 'Wanted' };

function JourneyDirection({
  heading, terrain, terrainCode, myKind, mine, setMine, theirs, setTheirs,
  path, perspective, partnerName, onCopy, copied, copyKey, style,
}) {
  // Two forms of the other person are needed and are not interchangeable:
  // "them" reads as an object ("ask them"), "they" as a subject ("do they
  // stand"), and a name takes singular agreement in either position.
  const other = partnerName || 'them';
  const otherForms = {
    subject: partnerName || 'they',
    object: other,
    possessive: partnerName ? `${partnerName}'s` : 'their',
    isNamed: Boolean(partnerName),
  };
  const role = ROLE[myKind];
  const theirKind = OPPOSITE[myKind];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');

  // A new pairing must not inherit the last one's half-finished edit.
  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setCodeInput('');
    setError('');
  }, [terrainCode]);

  const myCode = mine
    ? encodeView({ kind: myKind, params: terrain, x: mine.x, y: mine.y, exclusivity: mine.exclusivity })
    : null;

  function save() {
    setMine(draft);
    setEditing(false);
    setDraft(null);
    record('content_page_view', { page: `journey-${myKind}` });
  }

  function loadTheirs() {
    const view = decodeView(codeInput);
    if (!view) {
      setError('That is not a growth-journey code. Theirs starts with V2_ .');
      return;
    }
    if (view.kind !== theirKind) {
      setError(role.wrongKind);
      return;
    }
    // The code carries the terrain it was marked on. If that is not this
    // landscape, the point describes different ground and must be refused.
    const drift = view.params.reduce((m, v, i) => Math.max(m, Math.abs(v - terrain[i])), 0);
    if (drift > 0.02) {
      setError('That code was marked on a different landscape, so its point would not mean the same thing here.');
      return;
    }
    setTheirs({ x: view.x, y: view.y, exclusivity: view.exclusivity });
    setError('');
    setCodeInput('');
  }

  const narrative = path && buildPathNarrative(path, {
    perspective,
    otherName: partnerName || null,
    note: (myKind === 'desire' ? mine?.note : null) || null,
  });

  return (
    <div style={style}>
      <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>{heading}</h4>

      {(!mine || editing) ? (
        <PlacementPicker
          params={terrain}
          value={draft || mine || { x: 0.5, y: 0.5 }}
          onChange={setDraft}
          onDone={save}
          tone={myKind}
          title={role.title(otherForms)}
          prompt={role.prompt}
          pinLabel={role.pin(partnerName)}
          showExclusivity={role.extras}
          showNote={role.extras}
          doneLabel={role.done}
        />
      ) : (
        <div className="card" style={{
          padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
        }}>
          <p style={{ fontSize: '0.88rem', flex: '1 1 200px' }}>📍 {role.placed}</p>
          <button
            className="btn-secondary"
            onClick={() => { setDraft(mine); setEditing(true); }}
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
          >
            Change
          </button>
        </div>
      )}

      {/* The sealed half: only offered once your own answer exists. */}
      {mine && !editing && (
        <div className="card" style={{ marginTop: '0.75rem', padding: '1rem 1.15rem' }}>
          {theirs ? (
            <p style={{ fontSize: '0.88rem', color: '#2dd4a8' }}>
              ✓ {partnerName || 'They'} {role.theirDone}.
            </p>
          ) : (
            <>
              <h5 style={{ fontSize: '0.9rem', marginBottom: '0.35rem' }}>{role.askTitle(other)}</h5>
              <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '0.7rem' }}>
                {role.askBody} You will not see their answer until your own is saved — which it is.
              </p>

              {myCode && (
                <>
                  <code style={{
                    display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
                    padding: '0.5rem 0.7rem', borderRadius: '6px', background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)', wordBreak: 'break-all', marginBottom: '0.5rem',
                  }}>
                    {myCode}
                  </code>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                    Carries the point and the landscape it belongs to — not your note, and not your name.
                  </p>
                </>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {myCode && (
                  <button
                    className="btn-secondary"
                    onClick={() => onCopy(myCode, `mine-${copyKey}`)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    {copied === `mine-${copyKey}` ? 'Copied ✓' : 'Copy my answer'}
                  </button>
                )}
                {terrainCode && (
                  <button
                    className="btn-secondary"
                    onClick={() => onCopy(terrainCode, `terrain-${copyKey}`)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    {copied === `terrain-${copyKey}` ? 'Copied ✓' : 'Copy this landscape code'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => { setCodeInput(e.target.value); setError(''); }}
                  placeholder={role.theirLabel}
                  aria-label={role.theirLabel}
                  style={{
                    flex: '1 1 200px', minWidth: 0, padding: '0.55rem 0.8rem', borderRadius: '6px',
                    border: `1px solid ${error ? '#f97066' : 'var(--color-border)'}`,
                    background: 'var(--color-bg-card)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
                  }}
                />
                <button className="btn-primary" onClick={loadTheirs} style={{ padding: '0.55rem 1.1rem' }}>
                  Load
                </button>
              </div>
              {error && (
                <p role="alert" style={{ color: '#f97066', fontSize: '0.84rem', marginTop: '0.35rem' }}>{error}</p>
              )}
            </>
          )}
        </div>
      )}

      {path && (
        <div style={{ marginTop: '1rem' }}>
          <ContourView
            params={terrain}
            route={path.polyline}
            markers={[
              { key: 'start', x: path.start.x, y: path.start.y, label: PIN_LABEL.placement, tone: 'placement' },
              { key: 'end', x: path.end.x, y: path.end.y, label: PIN_LABEL.desire, tone: 'desire' },
            ]}
            showFeatureLabels={false}
          />
          <div style={{ marginTop: '1rem' }}>
            <ReadingRenderer text={narrativeToMarkdown(narrative)} />
          </div>
        </div>
      )}
    </div>
  );
}
