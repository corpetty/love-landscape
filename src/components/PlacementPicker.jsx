import React, { useState } from 'react';
import ContourView from './ContourView.jsx';
import { describePoint, constrainToMap } from '../terrain/placement.js';
import { featurePhrase } from '../data/pathNarrative.js';

/**
 * Mark one point on a landscape: where a bond stands, or where it wants to be.
 *
 * Guided first, then adjustable. A bare map asks for a spatial judgement most
 * people cannot make cold ("where on this terrain is my relationship?"), so the
 * two sliders ask the question in words — how emotional or physical, how deep —
 * and the map shows the answer. Dragging the pin is the refinement, not the
 * entry point.
 */
export default function PlacementPicker({
  params,
  value,
  onChange,
  onDone,
  tone = 'placement',
  title,
  prompt,
  pinLabel,
  showExclusivity = false,
  showNote = false,
  doneLabel = 'Save',
}) {
  const [more, setMore] = useState(false);
  const x = value?.x ?? 0.5;
  const y = value?.y ?? 0.5;
  const point = describePoint(x, y, params);

  function move(nextX, nextY) {
    const c = constrainToMap(nextX, nextY);
    onChange({ ...value, x: c.x, y: c.y });
  }

  const where = point.nearest
    ? `${point.nearest.isRidge ? 'On the' : 'In the'} ${featurePhrase(point.nearest)}`
    : `Open ground — ${point.quadrant.phrase}`;

  return (
    <div className="card" style={{ padding: '1.1rem 1.15rem' }}>
      {title && <h4 style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>{title}</h4>}
      {prompt && (
        <p style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '0.9rem' }}>
          {prompt}
        </p>
      )}

      <Slider
        label="Is this bond more emotional or more physical?"
        left="Emotional"
        right="Physical"
        value={x}
        onChange={(v) => move(v, y)}
      />
      <Slider
        label="How deep does it go?"
        left="Light"
        right="Deep"
        value={y}
        onChange={(v) => move(x, v)}
      />

      <p style={{
        fontSize: '0.82rem', color: 'var(--color-accent)', fontWeight: 600,
        margin: '0.5rem 0 0.75rem', textAlign: 'center',
      }}>
        {where}
        {point.inFog && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> — unmapped ground</span>}
      </p>

      <ContourView
        params={params}
        markers={[{ key: 'pin', x, y, label: pinLabel, tone }]}
        onPick={move}
        showFeatureLabels
      />
      <p style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.4rem' }}>
        Drag on the map to adjust.
      </p>

      {(showExclusivity || showNote) && (
        <div style={{ marginTop: '0.9rem' }}>
          {!more ? (
            <button
              onClick={() => setMore(true)}
              style={{ fontSize: '0.82rem', color: 'var(--color-accent)' }}
            >
              ＋ Add more (optional)
            </button>
          ) : (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.8rem' }}>
              {showExclusivity && (
                <>
                  <Slider
                    label="How exclusive do you want this bond to be?"
                    left="Open"
                    right="Exclusive"
                    value={value?.exclusivity ?? 0.5}
                    onChange={(v) => onChange({ ...value, exclusivity: v })}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '-0.3rem', marginBottom: '0.7rem' }}>
                    {value?.exclusivity == null
                      ? 'Not set — the map has no axis for this, so nothing will be said about it.'
                      : 'Set. This is an agreement rather than a place, so the reading treats it separately.'}
                    {value?.exclusivity != null && (
                      <button
                        onClick={() => onChange({ ...value, exclusivity: null })}
                        style={{ marginLeft: '0.4rem', color: 'var(--color-accent)', fontSize: '0.75rem' }}
                      >
                        clear
                      </button>
                    )}
                  </p>
                </>
              )}
              {showNote && (
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  What would that look like for you?
                  <textarea
                    value={value?.note || ''}
                    onChange={(e) => onChange({ ...value, note: e.target.value.slice(0, 280) })}
                    rows={2}
                    placeholder="One line, in your own words — optional"
                    style={{
                      width: '100%', marginTop: '0.3rem', padding: '0.5rem 0.6rem',
                      borderRadius: '6px', border: '1px solid var(--color-border)',
                      background: 'var(--color-bg-card)', color: 'var(--color-text)',
                      fontFamily: 'var(--font-body)', fontSize: '0.85rem', resize: 'vertical',
                    }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {onDone && (
        <button className="btn-primary" onClick={onDone} style={{ marginTop: '1rem', width: '100%' }}>
          {doneLabel}
        </button>
      )}
    </div>
  );
}

function Slider({ label, left, right, value, onChange }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.84rem', marginBottom: '0.3rem' }}>{label}</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
