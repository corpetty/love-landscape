import React, { useEffect, useMemo, useState } from 'react';
import { questions } from '../data/questions.js';
import { computeParams, PARAM_WEIGHTS } from '../data/paramCompute.js';
import { PARAM_LABELS } from '../data/interpretation.js';
import { record } from '../data/journey.js';

/**
 * The live weight matrix behind the terrain, made adjustable. Reads straight
 * from questions.js and paramCompute.js — the actual scoring code, not a
 * transcription of it — so this page can never drift out of sync with what
 * the assessment really does.
 */
export default function TerrainEngine({ onBack }) {
  const [answers, setAnswers] = useState({});
  const [openDim, setOpenDim] = useState(null);

  useEffect(() => {
    record('content_page_view', { page: 'terrain-engine' });
  }, []);

  const params = useMemo(() => computeParams(answers), [answers]);
  const getVal = (id) => answers[id] ?? 0.5;

  const maxAbsWeight = useMemo(
    () => Math.max(...PARAM_WEIGHTS.flatMap((d) => Object.values(d.coefs).map(Math.abs))),
    [],
  );

  function rangeOf(coefs, constant) {
    let lo = constant;
    let hi = constant;
    for (const w of Object.values(coefs)) { if (w > 0) hi += w; else lo += w; }
    return [Math.max(0, Math.min(1, lo)), Math.max(0, Math.min(1, hi))];
  }

  function setAnswer(qid, value) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }
  function resetAll() { setAnswers({}); }
  function randomizeAll() {
    const next = {};
    questions.forEach((q) => {
      next[q.id] = q.type === 'slider'
        ? Math.round(Math.random() * 100) / 100
        : q.options[Math.floor(Math.random() * q.options.length)].value;
    });
    setAnswers(next);
  }
  function setAllExtreme(direction) {
    const next = {};
    questions.forEach((q) => {
      if (q.type === 'slider') {
        next[q.id] = direction === 'min' ? 0 : 1;
      } else {
        const values = q.options.map((o) => o.value);
        next[q.id] = direction === 'min' ? Math.min(...values) : Math.max(...values);
      }
    });
    setAnswers(next);
  }

  function cellColor(weight) {
    if (weight === undefined) return 'transparent';
    const t = Math.min(1, Math.abs(weight) / maxAbsWeight);
    const varName = weight > 0 ? '--color-accent' : '--color-negative';
    const alpha = 16 + Math.round(t * 72);
    return `color-mix(in srgb, var(${varName}) ${alpha}%, transparent)`;
  }

  const reach = questions
    .map((q) => ({ id: q.id, count: PARAM_WEIGHTS.filter((d) => d.coefs[q.id] !== undefined).length }))
    .sort((a, b) => b.count - a.count);
  const maxReach = Math.max(...reach.map((r) => r.count));

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', paddingTop: '1.5rem' }}>
      {onBack && (
        <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
          Back
        </button>
      )}

      <h1 style={{ fontSize: '1.9rem', marginBottom: '0.5rem' }}>Terrain Engine</h1>
      <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.75, marginBottom: '2rem' }}>
        Nineteen answers feed thirteen weighted formulas to produce your terrain. This is that
        mapping, made adjustable — drag an answer below and watch it move the parameters it feeds.
        Nothing here is sent anywhere; it runs the same code the real assessment does.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
        <button className="btn-secondary" onClick={resetAll} style={smallBtnStyle}>Reset to neutral</button>
        <button className="btn-secondary" onClick={randomizeAll} style={smallBtnStyle}>Randomize</button>
        <button className="btn-secondary" onClick={() => setAllExtreme('min')} style={smallBtnStyle}>All minimum</button>
        <button className="btn-secondary" onClick={() => setAllExtreme('max')} style={smallBtnStyle}>All maximum</button>
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>Terrain parameters</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.87rem', marginBottom: '1rem' }}>
        Click one to see which answers are driving it.
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '0.6rem',
        marginBottom: '2.5rem',
      }}>
        {PARAM_WEIGHTS.map((dim, i) => {
          const label = PARAM_LABELS[i];
          const value = params[i];
          const [lo, hi] = rangeOf(dim.coefs, dim.constant);
          const open = openDim === i;
          return (
            <div
              key={dim.key}
              className="card"
              onClick={() => setOpenDim(open ? null : i)}
              style={{ padding: '0.85rem 1rem', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.87rem', fontWeight: 600 }}>{label.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-accent)' }}>
                  {Math.round(value * 100)}%
                </span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'var(--color-border-subtle)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${value * 100}%`, background: 'var(--color-accent)', borderRadius: '3px' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                range {Math.round(lo * 100)}–{Math.round(hi * 100)}%
              </div>

              {open && (
                <div style={{ marginTop: '0.65rem', paddingTop: '0.6rem', borderTop: '1px dashed var(--color-border)' }}>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '0.55rem' }}>
                    {label.definition}
                  </p>
                  {Object.entries(dim.coefs)
                    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                    .map(([qid, w]) => {
                      const contribution = w * getVal(qid);
                      const pct = (Math.abs(contribution) / maxAbsWeight) * 50;
                      return (
                        <div
                          key={qid}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2.4rem 1fr 2.8rem',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.68rem',
                            color: 'var(--color-text-muted)',
                            marginBottom: '0.2rem',
                          }}
                        >
                          <span>{qid}</span>
                          <span style={{ position: 'relative', height: '5px', background: 'var(--color-border-subtle)', borderRadius: '3px' }}>
                            <span style={{
                              position: 'absolute', left: '50%', top: '-2px', bottom: '-2px', width: '1px', background: 'var(--color-border)',
                            }}
                            />
                            <span style={{
                              position: 'absolute', top: 0, bottom: 0,
                              [contribution >= 0 ? 'left' : 'right']: '50%',
                              width: `${pct}%`,
                              background: contribution >= 0 ? 'var(--color-accent)' : 'var(--color-negative)',
                              borderRadius: '3px',
                            }}
                            />
                          </span>
                          <span style={{ textAlign: 'right' }}>{w > 0 ? '+' : ''}{w.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--color-text-muted)', opacity: 0.8, marginTop: '0.3rem' }}>
                    + constant floor {dim.constant.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>Assessment answers</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.87rem', marginBottom: '1rem' }}>
        Slider questions are continuous. Scenario questions are four discrete options whose values
        are rarely evenly spaced — some aren't even monotonic. Unanswered questions default to a
        neutral 0.5, exactly as the real assessment does.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '2.5rem' }}>
        {questions.map((q) => (
          <div key={q.id} className="card" style={{ padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--color-text-muted)', flexShrink: 0, paddingTop: '0.1rem' }}>
                {q.id}
              </span>
              <span style={{ fontSize: '0.88rem', flex: 1 }}>{q.text}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem', textTransform: 'uppercase',
                letterSpacing: '0.04em', color: 'var(--color-accent)', background: 'rgba(127,119,221,0.1)',
                padding: '0.15rem 0.45rem', borderRadius: '5px', whiteSpace: 'nowrap', height: 'fit-content',
              }}
              >
                {q.articleConcept}
              </span>
            </div>

            {q.type === 'slider' ? (
              <div>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={getVal(q.id)}
                  onChange={(e) => setAnswer(q.id, parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer', height: '6px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  <span>{q.left}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{getVal(q.id).toFixed(2)}</span>
                  <span>{q.right}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {q.options.map((opt, i) => {
                  const selected = answers[q.id] === opt.value;
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswer(q.id, opt.value)}
                      style={{
                        textAlign: 'left',
                        display: 'flex', justifyContent: 'space-between', gap: '0.6rem',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        border: `1px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: selected ? 'rgba(127,119,221,0.08)' : 'transparent',
                        color: 'var(--color-text)',
                        fontSize: '0.82rem',
                      }}
                    >
                      <span>{opt.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: selected ? 'var(--color-accent)' : 'var(--color-text-muted)', flexShrink: 0 }}>
                        {opt.value.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
                {answers[q.id] === undefined && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Unanswered — treated as neutral (0.50)
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>Full weight matrix</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.87rem', marginBottom: '1rem' }}>
        Every nonzero coefficient in the 13 formulas. Fill color encodes sign and magnitude; hover
        a cell for the exact number.
      </p>
      <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '10px', marginBottom: '0.9rem' }}>
        <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--color-bg-card)' }} />
              {PARAM_LABELS.map((label) => (
                <th
                  key={label.short}
                  style={{
                    padding: '0.5rem 0.3rem', writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                    textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: 500,
                    borderBottom: '1px solid var(--color-border)', height: '8rem', verticalAlign: 'bottom',
                  }}
                >
                  {label.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, ri) => (
              <tr key={q.id} style={{ background: ri % 2 ? 'var(--color-bg-sunken, var(--color-bg))' : undefined }}>
                <th style={{
                  position: 'sticky', left: 0, background: 'var(--color-bg-card)', textAlign: 'right',
                  padding: '0 0.6rem', color: 'var(--color-text-muted)', fontWeight: 400,
                  borderRight: '1px solid var(--color-border)', whiteSpace: 'nowrap',
                }}
                >
                  {q.id}
                </th>
                {PARAM_WEIGHTS.map((dim, ci) => {
                  const w = dim.coefs[q.id];
                  return (
                    <td key={ci} style={{ textAlign: 'center', padding: '2px' }}>
                      <div
                        title={w === undefined ? undefined : `${q.id} → ${PARAM_LABELS[ci].name}: ${w > 0 ? '+' : ''}${w.toFixed(2)} (${w > 0 ? 'same direction' : 'inverted'})`}
                        style={{ width: '26px', height: '22px', margin: '0 auto', borderRadius: '4px', background: cellColor(w) }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '2.5rem' }}>
        <Legend color="var(--color-accent)" label="raises the parameter as the answer rises" />
        <Legend color="var(--color-negative)" label="lowers it as the answer rises (inverted)" />
        <Legend color="transparent" bordered label="no relationship" />
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="card" style={{ flex: '1 1 300px', padding: '1.1rem 1.3rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', marginBottom: '0.4rem' }}>Question reach</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.8rem' }}>
            How many parameters each answer touches. A few questions are load-bearing hubs;
            several move exactly one thing.
          </p>
          {reach.map((r) => (
            <BarRow key={r.id} label={r.id} value={r.count} max={maxReach} />
          ))}
        </div>

        <div className="card" style={{ flex: '1 1 300px', padding: '1.1rem 1.3rem' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', marginBottom: '0.4rem' }}>Parameter composition</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.8rem' }}>
            How much of each parameter is fixed floor (present regardless of answers) versus how
            much genuinely swings with the answers.
          </p>
          {PARAM_WEIGHTS.map((dim, i) => {
            const swing = Object.values(dim.coefs).reduce((s, w) => s + Math.abs(w), 0);
            const floorPct = Math.round((dim.constant / (dim.constant + swing)) * 100);
            return <BarRow key={dim.key} label={PARAM_LABELS[i].short} value={floorPct} max={100} suffix="%" />;
          })}
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, bordered }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{
        width: '13px', height: '13px', borderRadius: '3px', background: color,
        border: bordered ? '1px solid var(--color-border)' : 'none',
      }}
      />
      {label}
    </span>
  );
}

function BarRow({ label, value, max, suffix = '' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '4.2rem 1fr 2.4rem', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ height: '7px', background: 'var(--color-border-subtle)', borderRadius: '4px', overflow: 'hidden', display: 'block' }}>
        <span style={{ display: 'block', height: '100%', width: `${(value / max) * 100}%`, background: 'var(--color-accent)', borderRadius: '4px' }} />
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textAlign: 'right', color: 'var(--color-text-muted)' }}>{value}{suffix}</span>
    </div>
  );
}

const smallBtnStyle = { fontSize: '0.78rem', padding: '0.45rem 0.9rem' };
