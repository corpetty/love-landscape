import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ContourView from './ContourView.jsx';
import PlacementPicker from './PlacementPicker.jsx';
import ReadingRenderer from './ReadingRenderer.jsx';
import JourneyReadingCard from './JourneyReadingCard.jsx';
import { findPath } from '../terrain/pathfinder.js';
import { buildPathNarrative, narrativeToMarkdown, symmetryLine } from '../data/pathNarrative.js';
import { encodeView, decodeView } from '../data/encoding.js';
import { getJourney, saveJourney } from '../data/journeys.js';
import { DISCLAIMER } from '../data/recommendations.js';
import { record } from '../data/journey.js';
import { createAsk, fetchAskStatus, withdrawAsk, askUrl } from '../data/asksClient.js';

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
export default function GrowthJourneyCard({ params, code, partnerParams, partnerCode, partnerName, clientResultId }) {
  const [state, setState] = useState(() => getJourney(code, partnerCode) || {});
  const [copied, setCopied] = useState('');
  const [askSlug, setAskSlug] = useState(null);

  // Reload whenever the pairing changes: without this the previous
  // comparison's pins would linger on a landscape they do not belong to.
  useEffect(() => {
    setState(getJourney(code, partnerCode) || {});
    setCopied('');
  }, [code, partnerCode]);

  /**
   * Rehydrate from the server's copy of the ask.
   *
   * The ask is the durable record: its pins outlive this device's localStorage,
   * and they are the only copy after a return from checkout, a new browser, or
   * a cleared cache. Fetching here rather than inside the link panel matters,
   * because the panel only renders once a placement exists — so a device with
   * no local pins could never have learned about the pins the server already
   * held, and would have asked the owner to place the same bond again.
   */
  const syncAsk = useCallback(async () => {
    if (!clientResultId) return;
    try {
      const status = await fetchAskStatus(clientResultId);
      if (!status?.ask) { setAskSlug(null); return null; }
      setAskSlug(status.ask.slug);
      setState((prev) => {
        const next = { ...prev };
        if (status.owner_point && !prev.placement) next.placement = status.owner_point;
        if (status.partner_point) next.theirDesire = status.partner_point;
        if (next.placement !== prev.placement || next.theirDesire !== prev.theirDesire) {
          saveJourney(code, partnerCode, next);
        }
        return next;
      });
      return status;
    } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientResultId, code, partnerCode]);

  useEffect(() => { syncAsk(); }, [syncAsk]);

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
        /* Only your own landscape can be opened to a question, and only a
           result this device owns can prove it. */
        clientResultId={clientResultId}
        askSlug={askSlug}
        onSyncAsk={syncAsk}
        onAskSlug={setAskSlug}
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
  clientResultId = null, askSlug = null, onSyncAsk = null, onAskSlug = null,
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
    record('placement_set', { kind: myKind, role: perspective });
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

  // The note belongs to whoever is MOVING — the person who said where they
  // want the bond to be — not to whoever happens to be reading. In direction A
  // that is the other person, and theirs is the note the owner most needs to
  // see; keying it to `mine` dropped it exactly where it mattered most.
  const moverNote = (myKind === 'desire' ? mine?.note : theirs?.note) || null;
  const narrative = path && buildPathNarrative(path, {
    perspective,
    otherName: partnerName || null,
    note: moverNote,
  });

  // A completed journey is the thing this whole feature exists to produce, so
  // it gets its own funnel step rather than hiding inside a page-view count.
  // Keyed on the story type: a re-render must not count as a second journey.
  const storyType = path?.storyType || null;
  useEffect(() => {
    if (storyType) record('path_view', { story: storyType, role: perspective });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyType, terrainCode]);

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
            <>
              <p style={{ fontSize: '0.88rem', color: '#2dd4a8', marginBottom: clientResultId ? '0.6rem' : 0 }}>
                ✓ {partnerName || 'They'} {role.theirDone}.
              </p>
              {/* An answered ask still serves the landscape to anyone holding
                  the link. The owner keeps the ability to close it — revoking
                  access must not become impossible by succeeding. */}
              {clientResultId && (
                <AskLinkPanel
                  clientResultId={clientResultId}
                  point={mine}
                  other={other}
                  onCopy={onCopy}
                  copied={copied}
                  askSlug={askSlug}
                  onSyncAsk={onSyncAsk}
                  onAskSlug={onAskSlug}
                  answered
                />
              )}
            </>
          ) : (
            <>
              <h5 style={{ fontSize: '0.9rem', marginBottom: '0.35rem' }}>{role.askTitle(other)}</h5>
              <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '0.7rem' }}>
                {role.askBody} You will not see their answer until your own is saved — which it is.
              </p>

              {clientResultId && (
                <AskLinkPanel
                  clientResultId={clientResultId}
                  point={mine}
                  other={other}
                  onCopy={onCopy}
                  copied={copied}
                  askSlug={askSlug}
                  onSyncAsk={onSyncAsk}
                  onAskSlug={onAskSlug}
                />
              )}

              {clientResultId && (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.9rem 0 0.5rem' }}>
                  Or pass codes by hand, if you would rather not send a link:
                </p>
              )}

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

          {/* The paid reading needs the pins server-side, which only the ask
              path provides. On the codes-only path there is no slug and the
              card renders nothing — deliberately, rather than offering a
              purchase the server could not regenerate. */}
          <JourneyReadingCard
            clientResultId={clientResultId}
            askSlug={askSlug}
            otherName={partnerName}
          />
        </div>
      )}
    </div>
  );
}


/**
 * The ask link: the same exchange as the codes below it, with the copying
 * removed. The owner's pin is sent with the link so the question is complete
 * the moment it is created — the recipient never waits on a second step.
 *
 * Checking for an answer is a button rather than a poll. An ask is answered
 * hours or days later, not seconds, so a background poll would spend requests
 * on nothing and put a spinner on a screen where nothing is happening.
 */
function AskLinkPanel({ clientResultId, point, other, onCopy, copied, askSlug, onSyncAsk, onAskSlug, answered = false }) {
  const [phase, setPhase] = useState('idle'); // idle | creating | checking | closing
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);

  async function create() {
    setPhase('creating');
    setError('');
    try {
      const out = await createAsk(clientResultId, {
        x: point.x, y: point.y, exclusivity: point.exclusivity ?? null,
      });
      onAskSlug?.(out.slug);
      setPhase('idle');
      record('ask_create');
    } catch (e) {
      setError(e.message);
      setPhase('idle');
    }
  }

  // A button rather than a poll: an ask comes back hours or days later, so a
  // background poll would spend requests on nothing and put a spinner on a
  // screen where nothing is happening.
  async function check() {
    setPhase('checking');
    setError('');
    try {
      const status = await onSyncAsk?.();
      setChecked(!status?.partner_point);
    } catch (e) {
      setError(e.message);
    }
    setPhase('idle');
  }

  async function close() {
    setPhase('closing');
    setError('');
    try {
      await withdrawAsk(clientResultId);
      onAskSlug?.(null);
      setPhase('idle');
    } catch (e) {
      setError(e.message);
      setPhase('idle');
    }
  }

  // Already answered: the only thing left to offer is shutting the link off.
  if (answered) {
    if (!askSlug) return null;
    return (
      <div>
        <button className="btn-secondary" onClick={close} disabled={phase === 'closing'} style={{ fontSize: '0.8rem' }}>
          {phase === 'closing' ? 'Closing…' : 'Close the link'}
        </button>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', lineHeight: 1.55 }}>
          The link still opens your landscape for anyone who has it. Closing stops that for good;
          the answer you already have stays.
        </p>
        {error && <p role="alert" style={{ color: '#f97066', fontSize: '0.84rem', marginTop: '0.35rem' }}>{error}</p>}
      </div>
    );
  }

  if (!askSlug) {
    return (
      <div>
        <button className="btn-primary" onClick={create} disabled={phase === 'creating'}>
          {phase === 'creating' ? 'Creating the link…' : `Send ${other} a link`}
        </button>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', lineHeight: 1.55 }}>
          They answer in one screen — no account, no assessment. Your own pin is not shown to them
          until they have given their answer.
        </p>
        {error && <p role="alert" style={{ color: '#f97066', fontSize: '0.84rem', marginTop: '0.35rem' }}>{error}</p>}
      </div>
    );
  }

  const url = askUrl(askSlug);
  return (
    <div>
      <code style={{
        display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
        padding: '0.5rem 0.7rem', borderRadius: '6px', background: 'var(--color-bg)',
        border: '1px solid var(--color-border)', wordBreak: 'break-all', marginBottom: '0.5rem',
      }}>
        {url}
      </code>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={() => onCopy(url, 'asklink')} style={{ fontSize: '0.82rem' }}>
          {copied === 'asklink' ? 'Link copied ✓' : 'Copy the link'}
        </button>
        <button className="btn-secondary" onClick={check} disabled={phase === 'checking'} style={{ fontSize: '0.82rem' }}>
          {phase === 'checking' ? 'Checking…' : 'Check for an answer'}
        </button>
        <button className="btn-secondary" onClick={close} disabled={phase === 'closing'} style={{ fontSize: '0.82rem' }}>
          {phase === 'closing' ? 'Closing…' : 'Close this question'}
        </button>
      </div>
      {checked && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.45rem' }}>
          No answer yet. They can take their time — the link keeps working until you close it.
        </p>
      )}
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.45rem', lineHeight: 1.55 }}>
        Closing it is permanent: the link stops working for good, and any answer on it is dropped.
      </p>
      {error && <p role="alert" style={{ color: '#f97066', fontSize: '0.84rem', marginTop: '0.35rem' }}>{error}</p>}
    </div>
  );
}
