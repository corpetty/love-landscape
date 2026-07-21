import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Funnel tab of the admin dashboard. Reads /api/admin (real boundary:
 * ADMIN_TOKEN verified server-side — the dashboard password gate is cosmetic).
 * Token is held in sessionStorage only.
 */

const TOKEN_KEY = 'll-admin-token';
const ACCENT = '#7F77DD';

// Campaign decision thresholds (docs/social-campaign-plan.md §1). A rate is
// "passing" when it clears the bar; shown green/amber purely as a reading aid.
const GATES = { completion: 0.60, share: 0.20, viral: 0.15, pair: 0.08, purchase: 0.015 };

function ratio(num, den) { return den > 0 ? num / den : null; }
function pct(r, gate) {
  if (r == null) return { text: '—', color: 'var(--color-text-muted)' };
  const text = `${(r * 100).toFixed(r < 0.1 ? 1 : 0)}%`;
  const color = gate == null ? 'var(--color-text)' : r >= gate ? '#3ec17a' : '#f0a836';
  return { text, color };
}

const MILESTONE_ORDER = ['create', 'publish', 'compare', 'signup', 'purchase'];
const MILESTONE_LABELS = {
  create: 'Completions',
  publish: 'Published',
  compare: 'Compares',
  signup: 'Sign-ups',
  purchase: 'Purchases',
};

export default function FunnelPanel() {
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  });
  const [tokenInput, setTokenInput] = useState('');
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(async (tok, d) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin?days=${d}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.status === 401) {
        setError('Invalid token.');
        setData(null);
        try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
        setToken('');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Request failed (${res.status})`);
        return;
      }
      setData(await res.json());
    } catch {
      setError('Network error — is /api/admin deployed?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchMetrics(token, days);
  }, [token, days, fetchMetrics]);

  function submitToken() {
    const tok = tokenInput.trim();
    if (!tok) return;
    try { sessionStorage.setItem(TOKEN_KEY, tok); } catch { /* ignore */ }
    setToken(tok);
    setTokenInput('');
  }

  if (!token) {
    return (
      <div style={{ maxWidth: '420px', margin: '2rem auto', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Funnel data requires the admin API token (server-verified; held in sessionStorage only).
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitToken()}
            placeholder="ADMIN_TOKEN"
            style={{
              flex: 1, padding: '0.6rem 0.85rem', borderRadius: '6px',
              border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', fontSize: '0.95rem',
            }}
          />
          <button className="btn-primary" onClick={submitToken}>Load</button>
        </div>
        {error && <p style={{ color: '#f97066', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</p>}
      </div>
    );
  }

  const milestones = data?.milestones || {};
  const events = data?.events || {};
  const totals = data?.totals || {};
  const daily = (data?.daily_creates || []).map((d) => ({ day: d.day.slice(5), count: d.count }));
  const rejections = data?.rate_limit_rejections || [];
  const bySource = data?.by_source || [];
  const shareLoop = data?.share_loop || {};

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={days === d ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
          >
            {d}d
          </button>
        ))}
        {loading && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading…</span>}
        {error && <span style={{ color: '#f97066', fontSize: '0.85rem' }}>{error}</span>}
      </div>

      {data && (
        <>
          {/* Funnel milestone cards (persons = deduped, dev-excluded) */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '0.75rem', marginBottom: '2rem',
          }}>
            {MILESTONE_ORDER.map((kind) => (
              <div key={kind} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.7rem', fontWeight: 700, color: ACCENT, fontFamily: 'var(--font-mono)' }}>
                  {(milestones[kind]?.persons ?? 0).toLocaleString()}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                  {MILESTONE_LABELS[kind]}
                </div>
              </div>
            ))}
          </div>

          {/* Daily completions */}
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Daily completions (persons)</h3>
          <div className="card" style={{ padding: '1rem', marginBottom: '2rem' }}>
            {daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={daily}>
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{
                    background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                    borderRadius: '6px', fontSize: '0.8rem',
                  }} />
                  <Bar dataKey="count" fill={ACCENT} radius={[2, 2, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No completions in window.</p>
            )}
          </div>

          {/* Campaign decision metrics — per source (docs/social-campaign-plan.md §1) */}
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem' }}>Campaign funnel by source</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
            First-touch <code>utm_source</code>. Green ≥ gate, amber below. Starts are best-effort (events);
            completions/published/purchases are server-truth (milestones). Global viral pull:{' '}
            <strong style={pct(ratio(shareLoop.starts_from_share, shareLoop.share_page_views), GATES.viral)}>
              {pct(ratio(shareLoop.starts_from_share, shareLoop.share_page_views), GATES.viral).text}
            </strong>{' '}
            ({(shareLoop.starts_from_share ?? 0).toLocaleString()} starts / {(shareLoop.share_page_views ?? 0).toLocaleString()} share views).
          </p>
          <div className="card" style={{ padding: '1rem', marginBottom: '2rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse', minWidth: '640px' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-muted)', textAlign: 'right' }}>
                  <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left' }}>source</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>starts</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>completions</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>completion %</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>share %</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>pair %</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>purchase %</th>
                </tr>
              </thead>
              <tbody>
                {bySource.map((s) => {
                  const comp = pct(ratio(s.completions, s.starts), GATES.completion);
                  const share = pct(ratio(s.published, s.completions), GATES.share);
                  const pair = pct(ratio(s.compares, s.completions), GATES.pair);
                  const buy = pct(ratio(s.purchases, s.completions), GATES.purchase);
                  return (
                    <tr key={s.source} style={{ borderTop: '1px solid var(--color-border)', textAlign: 'right' }}>
                      <td style={{ padding: '0.3rem 0.5rem', textAlign: 'left', fontFamily: 'var(--font-mono)' }}>{s.source}</td>
                      <td style={{ padding: '0.3rem 0.5rem' }}>{s.starts.toLocaleString()}</td>
                      <td style={{ padding: '0.3rem 0.5rem' }}>{s.completions.toLocaleString()}</td>
                      <td style={{ padding: '0.3rem 0.5rem', color: comp.color, fontWeight: 600 }}>{comp.text}</td>
                      <td style={{ padding: '0.3rem 0.5rem', color: share.color, fontWeight: 600 }}>{share.text}</td>
                      <td style={{ padding: '0.3rem 0.5rem', color: pair.color, fontWeight: 600 }}>{pair.text}</td>
                      <td style={{ padding: '0.3rem 0.5rem', color: buy.color, fontWeight: 600 }}>{buy.text}</td>
                    </tr>
                  );
                })}
                {bySource.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '0.5rem', color: 'var(--color-text-muted)' }}>No attributed traffic in window.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Diagnostic events */}
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
            Client events <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>
              (best-effort — ad blockers undercount these; milestones above are server-truth)
            </span>
          </h3>
          <div className="card" style={{ padding: '1rem', marginBottom: '2rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.3rem 0.5rem' }}>event</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>sessions</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(events).sort((a, b) => b[1].sessions - a[1].sessions).map(([name, v]) => (
                  <tr key={name} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.3rem 0.5rem', fontFamily: 'var(--font-mono)' }}>{name}</td>
                    <td style={{ padding: '0.3rem 0.5rem' }}>{v.sessions.toLocaleString()}</td>
                    <td style={{ padding: '0.3rem 0.5rem' }}>{v.total.toLocaleString()}</td>
                  </tr>
                ))}
                {Object.keys(events).length === 0 && (
                  <tr><td colSpan={3} style={{ padding: '0.5rem', color: 'var(--color-text-muted)' }}>No events in window.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* All-time totals + limiter pressure */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div className="card" style={{ padding: '1rem', flex: '1 1 280px' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>All-time</h4>
              <ul style={{ listStyle: 'none', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                <li>Results: <strong>{totals.results ?? 0}</strong> ({totals.results_published ?? 0} published)</li>
                <li>Accounts: <strong>{totals.accounts ?? 0}</strong></li>
                <li>Paid purchases: <strong>{totals.purchases_paid ?? 0}</strong></li>
                <li>Saved comparisons: <strong>{totals.comparisons_saved ?? 0}</strong></li>
                <li>Research submissions: <strong>{totals.research_submissions ?? 0}</strong></li>
              </ul>
            </div>
            <div className="card" style={{ padding: '1rem', flex: '1 1 280px' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Rate-limiter pressure</h4>
              {rejections.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No buckets near their caps. Good.</p>
              ) : (
                <ul style={{ listStyle: 'none', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  {rejections.map((r) => <li key={r.bucket}>{r.bucket}: {r.count}</li>)}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
